const {app, BrowserWindow, Menu, ipcMain, Tray} = require('electron');
const {spawn} = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const {default: Store} = require('electron-store');
const store = new Store();

let mainWindow;
let serverProcess;
let clientProcess;
let tray;

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 480,
        height: 800,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            devTools: isDev,
            partition: 'persist:storytel-app',
            preload: path.join(__dirname, 'preload.js')
        },
        maximizable: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'client/public/assets/icon.png'),
        show: false,
    });

    // Start Fastify server
    if (isDev) {
        startDevelopmentServers();
    } else {
        Menu.setApplicationMenu(null);
        mainWindow.setMenu(null);
        startProductionServer();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startDevelopmentServers() {
    // Start Fastify server
    serverProcess = spawn('npm', ['run', 'server:dev'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    // Start React development server
    clientProcess = spawn('npm', ['run', 'client'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    // Wait for servers to start, then load the React app
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 5000);

}

function startProductionServer() {
    // Start Fastify server using esbuild bundle
    const serverPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'dist', 'server.js')
        : path.join(__dirname, 'server', 'dist', 'server.js');

    serverProcess = spawn('node', [serverPath], {
        stdio: 'inherit'
    });

    // Load the built React app
    mainWindow.loadFile(path.join(__dirname, 'client/build/index.html'));
}

function createTray() {
    const iconPath = path.join(__dirname, 'client/public/assets/icon.png');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Play/Pause',
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.send('tray-play-pause');
                }
            }
        },
        {
            label: 'Playback Speed',
            submenu: [
                {
                    label: '0.5x',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('tray-set-speed', 0.5);
                        }
                    }
                },
                {
                    label: '1.0x',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('tray-set-speed', 1.0);
                        }
                    }
                },
                {
                    label: '1.25x',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('tray-set-speed', 1.25);
                        }
                    }
                },
                {
                    label: '1.75x',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('tray-set-speed', 1.75);
                        }
                    }
                },
                {
                    label: '2.0x',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('tray-set-speed', 2.0);
                        }
                    }
                }
            ]
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('Storytel Player');

    tray.on('double-click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
});

ipcMain.handle('store-get', (event, key) =>  store.get(key));
ipcMain.handle('store-set', (event, key, value) => store.set(key, value));
ipcMain.handle('store-remove', (event, key) => store.delete(key));


app.on('window-all-closed', () => {
    // Don't quit the app when all windows are closed, just hide to tray
    // Only quit when explicitly requested through tray menu
    if (app.isQuitting) {
        // Kill server processes
        if (serverProcess) {
            serverProcess.kill();
        }
        if (clientProcess) {
            clientProcess.kill();
        }

        if (process.platform !== 'darwin') {
            app.quit();
        }
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle app certificate errors in development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});
