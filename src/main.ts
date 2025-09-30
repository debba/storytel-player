import { app, BrowserWindow } from 'electron';
import { WindowManager } from './modules/window';
import { TrayManager } from './modules/tray';
import { ServerManager } from './modules/server';
import { IpcManager } from './modules/ipc';

const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.IS_DEBUG === 'true';

let windowManager: WindowManager;
let trayManager: TrayManager;
let serverManager: ServerManager;
let ipcManager: IpcManager;

async function initialize(): Promise<void> {
  windowManager = new WindowManager(isDev, isDebug);
  const mainWindow = windowManager.create();

  trayManager = new TrayManager(windowManager);
  trayManager.create();

  serverManager = new ServerManager();
  await serverManager.initialize();

  ipcManager = new IpcManager(serverManager, trayManager);
  ipcManager.setupHandlers();
}

app.whenReady().then(initialize);

app.on('window-all-closed', async () => {
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
