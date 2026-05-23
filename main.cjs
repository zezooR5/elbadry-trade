const { app, BrowserWindow } = require('electron');
const path = require('path');

// Determine if we are in development mode robustly without env vars
const isDev = !app.isPackaged;


let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false, // best security practice
      contextIsolation: true, // best security practice
      preload: path.join(__dirname, 'preload.cjs')
    },
    // Royal Blue visual identity window framing
    title: 'Elbadry Trade - إدارة المبيعات والمخازن والحسابات',
    autoHideMenuBar: true, // Hide browser top menu bar for a premium desktop app look
    backgroundColor: '#0f172a', // Slate-900 background matches app dark mode
    show: false // Show only when ready to avoid flicker
  });

  // Maximize the window to fit the ERP workspace perfectly
  mainWindow.maximize();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Create preload file if it doesn't exist
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
