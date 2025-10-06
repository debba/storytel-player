import {autoUpdater, UpdateDownloadedEvent, UpdateInfo} from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { i18n } from '../i18n';

export class UpdaterManager {
    private readonly mainWindow: BrowserWindow | null;
    private readonly isDev: boolean;

    constructor(mainWindow: BrowserWindow | null, isDev: boolean) {
        this.mainWindow = mainWindow;
        this.isDev = isDev;

        // Configure auto-updater
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
    }

    public initialize(): void {
        if (this.isDev) {
            console.log('Auto-updater disabled in development mode');
            return;
        }

        // Check for updates on startup
        this.checkForUpdates();

        // Setup event listeners
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        autoUpdater.on('checking-for-update', () => {
            console.log('Checking for updates...');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info.version);
            this.showUpdateAvailableDialog(info);
        });

        autoUpdater.on('update-not-available', () => {
            console.log('No updates available');
        });

        autoUpdater.on('error', (err) => {
            console.error('Error in auto-updater:', err);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
            console.log(message);

            // Send progress to renderer if needed
            if (this.mainWindow) {
                this.mainWindow.webContents.send('update-download-progress', progressObj);
            }
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('Update downloaded:', info.version);
            this.showUpdateReadyDialog(info);
        });
    }

    public checkForUpdates(): void {
        if (!this.isDev) {
            autoUpdater.checkForUpdates().catch(err => {
                console.error('Failed to check for updates:', err);
            });
        }
    }

    private async showUpdateAvailableDialog(info: UpdateInfo) {
        if (!this.mainWindow) return;

        const {response : result} = await dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: i18n.t('updater.available.title'),
            message: `${i18n.t('updater.available.message')} ${info.version}`,
            buttons: [i18n.t('updater.available.download'), i18n.t('updater.available.later')],
            defaultId: 0,
            cancelId: 1
        });

        if (result === 0) {
            autoUpdater.downloadUpdate().catch(err => {
                console.error('Failed to download update:', err);
            });
        }
    }

    private async showUpdateReadyDialog(info: UpdateDownloadedEvent) {
        if (!this.mainWindow) return;

        const {response: result} = await dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: i18n.t('updater.ready.title'),
            message: `${i18n.t('updater.ready.message')} ${info.version}`,
            buttons: [i18n.t('updater.ready.restart'), i18n.t('updater.ready.later')],
            defaultId: 0,
            cancelId: 1
        });

        if (result === 0) {
            autoUpdater.quitAndInstall();
        }
    }
}
