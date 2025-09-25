const {app, BrowserWindow, Menu, nativeImage} = require('electron');
const {spawn} = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;
let clientProcess;

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 480,
        height: 800,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            devTools: isDev,
            enableRemoteModule: false,
            webSecurity: true,
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
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
