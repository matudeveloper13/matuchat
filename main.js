const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        icon: __dirname + '/icon.png',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    win.loadFile('index.html');
    
    // Maximized window (has your title bar and taskbar, not true full screen)
    win.maximize();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});