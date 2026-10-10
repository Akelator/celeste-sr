const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 640,
    height: 420,
    minWidth: 360,
    minHeight: 240,
    title: 'Gamepad Inputs',
    autoHideMenuBar: true,
    backgroundColor: '#101521',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) win.loadURL(startUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'browser', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
