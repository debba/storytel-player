import {app, BrowserWindow} from 'electron';
import {WindowManager} from './modules/window';
import {TrayManager} from './modules/tray';
import {ServerManager} from './modules/server';
import {IpcManager} from './modules/ipc';
import {UpdaterManager} from './modules/updater';
import {i18n} from './i18n';

const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.IS_DEBUG === 'true';

let windowManager: WindowManager;
let trayManager: TrayManager;
let serverManager: ServerManager;
let ipcManager: IpcManager;
let updaterManager: UpdaterManager;

async function initialize(): Promise<void> {
    windowManager = new WindowManager(isDev, isDebug);
    const mainWindow = windowManager.create();

    serverManager = new ServerManager();
    await serverManager.initialize();

    // Initialize i18n with the Fastify server
    const fastifyServer = serverManager.getServer();
    if (fastifyServer) {
        i18n.setAppLocale(app.getLocale());
        i18n.detectLanguage();
        await i18n.initialize(fastifyServer);
    }

    trayManager = new TrayManager(windowManager);
    trayManager.create();

    ipcManager = new IpcManager(serverManager, trayManager);
    ipcManager.setupHandlers();

    // Initialize auto-updater
    updaterManager = new UpdaterManager(mainWindow, isDev);
    updaterManager.initialize();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // When someone tries to open a second instance, focus the existing window
        if (windowManager) {
            windowManager.show();
        }
    });

    app.whenReady().then(initialize);
}

app.on('window-all-closed', async () => {
    // @ts-ignore
    if (app.isQuitting) {
        const window = windowManager.getWindow();
        if (window) {
            await window.webContents.send('tray-play-pause');
        }

        windowManager.killClientProcess();

        if (process.platform !== 'darwin') {
            app.quit();
        }
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.create();
    }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});
