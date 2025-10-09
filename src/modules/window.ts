import {BrowserWindow, Menu, app} from 'electron';
import {spawn, ChildProcess} from 'child_process';
import * as path from 'path';
import {WindowConfig} from '../types';

export class WindowManager {
    private mainWindow: BrowserWindow | null = null;
    private clientProcess: ChildProcess | null = null;
    private isDev: boolean;
    private isDebug: boolean;

    constructor(isDev: boolean, isDebug: boolean) {
        this.isDev = isDev;
        this.isDebug = isDebug;
    }

    create(): BrowserWindow {
        const windowConfig: WindowConfig = {
            width: 480,
            height: 800,
            resizable: this.isDebug,
            maximizable: this.isDebug,
            alwaysOnTop: !this.isDebug
        };

        this.mainWindow = new BrowserWindow({
            ...windowConfig,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: true,
                devTools: this.isDev || this.isDebug,
                partition: 'persist:storytel-app',
                preload: path.join(__dirname, '../preload.js'),
            },
            icon: path.join(__dirname, '../../../assets/icon.png'),
            show: false,
        });

        if (this.isDev) {
            this.startDevelopmentServers();
        } else {
            if (!this.isDebug) {
                Menu.setApplicationMenu(null);
                this.mainWindow.setMenu(null);
            }
            this.startProductionServer();
        }

        this.setupEventHandlers();

        return this.mainWindow;
    }

    private setupEventHandlers(): void {
        if (!this.mainWindow) return;

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });

        this.mainWindow.on('close', (event) => {
            // @ts-ignore
            if (!app.isQuitting) {
                event.preventDefault();
                this.mainWindow?.hide();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    private startDevelopmentServers(): void {
        this.clientProcess = spawn('npm', ['run', 'client'], {
            cwd: path.join(__dirname, '../../../'),
            stdio: 'inherit',
        });

        setTimeout(() => {
            this.mainWindow?.loadURL('http://localhost:3000');
        }, 5000);
    }

    private startProductionServer(): void {
        const indexPath = path.join(__dirname, '../../../client/build/index.html');
        this.mainWindow?.loadFile(indexPath);
    }

    getWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    killClientProcess(): void {
        if (this.clientProcess) {
            this.clientProcess.kill();
        }
    }

    show(): void {
        if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
        }
    }

    hide(): void {
        this.mainWindow?.hide();
    }

    isVisible(): boolean {
        return this.mainWindow?.isVisible() ?? false;
    }
}
