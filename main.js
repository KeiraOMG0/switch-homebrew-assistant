const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const crypto = require('crypto');
const drivelist = require('drivelist');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'Switch Homebrew Assistant',
    backgroundColor: '#0a0e12'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ========== IPC HANDLERS ==========
ipcMain.handle('read-serial-db', async () => {
  const dbPath = path.join(__dirname, 'renderer', 'serial-db.json');
  const data = await fs.readFile(dbPath, 'utf-8');
  return JSON.parse(data);
});

ipcMain.handle('get-drives', async () => {
  const drives = await drivelist.list();
  return drives.filter(d => d.isRemovable || (d.mountpoints.length && d.size > 1e9 && d.size < 2e12))
    .map(drive => ({
      device: drive.device,
      mountpoint: drive.mountpoints[0]?.path || drive.device,
      size: drive.size,
      isRemovable: drive.isRemovable,
      description: drive.description
    }));
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('download-files', async (event, items, targetDir) => {
  const results = [];
  for (const item of items) {
    try {
      const response = await axios({
        method: 'GET',
        url: item.url,
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          event.sender.send('download-progress', { id: item.id, percent, total: progressEvent.total });
        }
      });
      const filename = path.basename(item.url);
      const filePath = path.join(targetDir, filename);
      const writer = createWriteStream(filePath);
      await streamPipeline(response.data, writer);
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      results.push({ id: item.id, name: filename, path: filePath, checksum: hash, source: item.url, success: true });
    } catch (error) {
      results.push({ id: item.id, name: item.name, success: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('get-github-release', async (event, repo, assetPattern) => {
  const url = `https://api.github.com/repos/${repo}/releases/latest`;
  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Switch-Homebrew-Assistant' } });
    const asset = response.data.assets.find(a => a.name.includes(assetPattern) || a.name.endsWith('.zip') || a.name.endsWith('.bin'));
    if (asset) return { name: asset.name, url: asset.browser_download_url, size: asset.size, version: response.data.tag_name };
    return null;
  } catch (error) {
    console.error(`Failed to fetch release for ${repo}:`, error.message);
    return null;
  }
});

ipcMain.handle('copy-file-to-sd', async (event, sourcePath, destPath) => {
  try {
    await fs.copy(sourcePath, destPath, { overwrite: true });
    return { success: true, destPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log-action', async (event, logEntry) => {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${logEntry.type}: ${logEntry.message}\n`;
  await fs.appendFile(path.join(app.getPath('userData'), 'assistant.log'), entry).catch(console.error);
  return true;
});

ipcMain.handle('export-logs', async () => {
  const logPath = path.join(app.getPath('userData'), 'assistant.log');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Logs',
    defaultPath: `switch-assistant-logs-${Date.now()}.log`,
    filters: [{ name: 'Log Files', extensions: ['log'] }]
  });
  if (!result.canceled && result.filePath) {
    await fs.copy(logPath, result.filePath);
    return result.filePath;
  }
  return null;
});