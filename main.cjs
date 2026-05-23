const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Determine if we are in development mode robustly without env vars
const isDev = !app.isPackaged;

// Configure updater logging
autoUpdater.logger = console;

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
    // Check for updates on startup
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
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

// Auto Updater Listeners
autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'تحديث جديد متوفر',
      message: `تم تنزيل الإصدار الجديد (${info.version}) بنجاح. هل تريد إغلاق البرنامج وتثبيت التحديث الآن؟`,
      buttons: ['تثبيت وإعادة التشغيل', 'لاحقاً'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  }
});
