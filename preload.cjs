const { contextBridge } = require('electron');

// Expose safe platform utilities to the React frontend if needed
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true
});
