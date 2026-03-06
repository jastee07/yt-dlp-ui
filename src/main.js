const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { spawn, spawnSync } = require('child_process');
const { validateTimes, resolveClipName, buildYtDlpArgs } = require('./core/clipper');
const { summarizeDependencyStatus } = require('./core/deps');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

async function loadConfig() {
  try {
    return JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  } catch {
    return { defaultSavePath: '', counters: {} };
  }
}

async function saveConfig(config) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function hasBinary(binary) {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(cmd, [binary], { stdio: 'ignore' });
  return result.status === 0;
}

function getDependencyStatus() {
  return summarizeDependencyStatus({
    ytDlp: hasBinary('yt-dlp'),
    ffmpeg: hasBinary('ffmpeg'),
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 720,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('config:get', async () => loadConfig());
ipcMain.handle('deps:check', async () => getDependencyStatus());

ipcMain.handle('dialog:pick-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths?.length) return { ok: false };
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle('clip:run', async (_evt, payload) => {
  const { url, savePath, name, start, end } = payload || {};
  if (!url || typeof url !== 'string' || !url.includes('youtube.com/watch')) {
    return { ok: false, error: 'Invalid YouTube watch URL.' };
  }
  if (!savePath || typeof savePath !== 'string') {
    return { ok: false, error: 'Save path is required.' };
  }

  const deps = getDependencyStatus();
  if (!deps.ok) return { ok: false, error: deps.message };

  const time = validateTimes(start, end);
  if (!time.ok) return time;

  await fs.mkdir(savePath, { recursive: true });
  const config = await loadConfig();
  config.defaultSavePath = savePath;

  const { name: baseName } = resolveClipName({
    providedName: name,
    savePath,
    state: config,
  });

  await saveConfig(config);

  const args = buildYtDlpArgs({
    url,
    savePath,
    baseName,
    start: time.start,
    end: time.end,
  });

  return new Promise((resolve) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => {
      if (code === 0) return resolve({ ok: true, file: path.join(savePath, baseName) });
      return resolve({ ok: false, error: stderr || `yt-dlp failed (code ${code})` });
    });
  });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
