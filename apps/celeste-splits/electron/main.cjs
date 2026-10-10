const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

function resolveIndexFile() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'browser', 'index.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const allDisplays = screen.getAllDisplays();

  const leftDisplayCandidates = allDisplays.filter(
    (display) => display.bounds.x < primaryDisplay.bounds.x,
  );

  const targetDisplay =
    leftDisplayCandidates.length > 0
      ? leftDisplayCandidates.reduce((closestLeft, currentDisplay) =>
          currentDisplay.bounds.x > closestLeft.bounds.x ? currentDisplay : closestLeft,
        )
      : primaryDisplay;

  const { x, y } = targetDisplay.workArea;

  const win = new BrowserWindow({
    x,
    y,
    width: 490,
    minWidth: 490,
    maxWidth: 490,
    height: 860,
    autoHideMenuBar: true,
    backgroundColor: '#0f1117',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;
  const indexFile = resolveIndexFile();

  if (startUrl) {
    win.loadURL(startUrl);
    return;
  }

  if (indexFile) {
    win.loadFile(indexFile);
    return;
  }

  win.loadURL('http://localhost:4200');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
