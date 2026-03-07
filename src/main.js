const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { spawnSync } = require('child_process');
const { validateTimes, resolveClipName } = require('./core/clipper');
const { summarizeDependencyStatus } = require('./core/deps');
const { validateClipRequest, validateOutputPath } = require('./core/validation');
const { runWrapperCommand } = require('./core/wrapper');
const { createLifecycleTracker } = require('./core/lifecycle');

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
    width: 760,
    height: 700,
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

ipcMain.handle('clip:metadata', async (_evt, payload) => {
  const request = validateClipRequest(payload);
  if (!request.ok) return { ok: false, error: request.errors[0] };

  const deps = getDependencyStatus();
  if (!deps.ok) return { ok: false, error: deps.message };

  const envelope = await runWrapperCommand('metadata', {
    url: request.normalized.url,
    retryCount: 1,
  });

  if (!envelope.ok) {
    return {
      ok: false,
      error: envelope.error?.message || 'Metadata request failed',
      details: envelope.error?.details,
    };
  }

  return { ok: true, metadata: envelope.result };
});

ipcMain.handle('clip:run', async (_evt, payload) => {
  const lifecycle = createLifecycleTracker();
  lifecycle.add('queued');

  const request = validateClipRequest(payload);
  if (!request.ok) return { ok: false, error: request.errors[0], lifecycle: lifecycle.list() };

  const deps = getDependencyStatus();
  if (!deps.ok) return { ok: false, error: deps.message, lifecycle: lifecycle.list() };

  lifecycle.add('validating');
  const time = validateTimes(request.normalized.start, request.normalized.end);
  if (!time.ok) return { ok: false, error: time.error, lifecycle: lifecycle.list() };

  const outputPath = validateOutputPath(request.normalized.savePath);
  if (!outputPath.ok) return { ok: false, error: outputPath.error, details: outputPath.details, lifecycle: lifecycle.list() };

  lifecycle.add('processing', { step: 'resolve-output' });

  const config = await loadConfig();
  config.defaultSavePath = outputPath.resolvedPath;

  const { name: baseName } = resolveClipName({
    providedName: request.normalized.name,
    savePath: outputPath.resolvedPath,
    state: config,
  });

  await saveConfig(config);

  lifecycle.add('downloading');
  const envelope = await runWrapperCommand('download', {
    url: request.normalized.url,
    savePath: outputPath.resolvedPath,
    clipNamePolicy: request.normalized.name ? 'explicit' : 'auto',
    clip: {
      name: request.normalized.name || undefined,
      start: time.start || undefined,
      end: time.end || undefined,
    },
    outputHint: baseName,
    format: request.normalized.format || undefined,
    retryCount: 1,
  });

  if (!envelope.ok) {
    const attempt = envelope.error?.details?.attempt;
    const maxAttempts = envelope.error?.details?.maxAttempts;
    lifecycle.add('failed', { attempt, maxAttempts });
    return {
      ok: false,
      lifecycle: lifecycle.list(),
      attempt,
      maxAttempts,
      error: envelope.error?.message || 'Download failed',
      details: envelope.error?.details,
    };
  }

  lifecycle.add('done');
  return {
    ok: true,
    lifecycle: lifecycle.list(),
    file: envelope.result?.savedFile,
    usedArgs: envelope.result?.usedArgs,
  };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
