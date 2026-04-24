const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readSerialDB: () => ipcRenderer.invoke('read-serial-db'),
  getDrives: () => ipcRenderer.invoke('get-drives'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  downloadFiles: (items, targetDir) => ipcRenderer.invoke('download-files', items, targetDir),
  getGithubRelease: (repo, assetPattern) => ipcRenderer.invoke('get-github-release', repo, assetPattern),
  copyFileToSD: (sourcePath, destPath) => ipcRenderer.invoke('copy-file-to-sd', sourcePath, destPath),
  logAction: (logEntry) => ipcRenderer.invoke('log-action', logEntry),
  exportLogs: () => ipcRenderer.invoke('export-logs'),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
  openExternal: (url) => ipcRenderer.send('open-external', url)
});

ipcRenderer.on('open-external', (event, url) => {
  require('electron').shell.openExternal(url);
});