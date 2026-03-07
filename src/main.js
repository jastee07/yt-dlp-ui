const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { spawnSync } = require('child_process');
const { validateTimes, resolveClipName } = require('./core/clipper');
const { summarizeDependencyStatus } = require('./core/deps');
const { validateClipRequest, validateOutputPath } = require('./core/validation');
const { runWrapperCommand } = require('./core/wrapper');
const { createLifecycleTracker } = require('./core/lifecycle');
const { normalizeConfig, applySettingsUpdate } = require('./core/config');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const LOG_PATH = path.join(LOG_DIR, 'app.log');

async function loadConfig() {
  try {
    return normalizeConfig(JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8')));
  } catch {
    return normalizeConfig();
  }
}

async function saveConfig(config) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(normalizeConfig(config), null, 2));
}

async function appendLog(level, event, details = {}) {
  const line = JSON.stringify({ at: new Date().toISOString(), level, event, details });
  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.appendFile(LOG_PATH, `${line}\n`, 'utf8');
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
ipcMain.handle('settings:update', async (_evt, payload = {}) => {
  const current = await loadConfig();
  const next = applySettingsUpdate(current, payload);
  await saveConfig(next);
  await appendLog('info', 'settings.updated', {
    hasDefaultSavePath: Boolean(next.defaultSavePath),
    hasDefaultFormat: Boolean(next.defaultFormat),
  });
  return { ok: true, config: next };
});
ipcMain.handle('logs:get-info', async () => ({ ok: true, path: LOG_PATH, dir: LOG_DIR }));
ipcMain.handle('logs:open-folder', async () => {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const error = await shell.openPath(LOG_DIR);
  return { ok: !error, error: error || undefined, dir: LOG_DIR };
});
ipcMain.handle('deps:check', async () => getDependencyStatus());

ipcMain.handle('dialog:pick-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths?.length) return { ok: false };
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle('clip:metadata', async (_evt, payload) => {
  const request = validateClipRequest(payload, { requireSavePath: false });
  if (!request.ok) {
    await appendLog('warn', 'metadata.validation_failed', { errors: request.errors });
    return { ok: false, error: request.errors[0] };
  }

  const deps = getDependencyStatus();
  if (!deps.ok) {
    await appendLog('warn', 'metadata.deps_failed', { message: deps.message });
    return { ok: false, error: deps.message };
  }

  const envelope = await runWrapperCommand('metadata', {
    url: request.normalized.url,
    retryCount: 1,
  });

  if (!envelope.ok) {
    await appendLog('error', 'metadata.wrapper_failed', {
      message: envelope.error?.message,
      details: envelope.error?.details,
    });
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
  if (!request.ok) {
    await appendLog('warn', 'clip.validation_failed', { errors: request.errors });
    return { ok: false, error: request.errors[0], lifecycle: lifecycle.list() };
  }

  const deps = getDependencyStatus();
  if (!deps.ok) {
    await appendLog('warn', 'clip.deps_failed', { message: deps.message });
    return { ok: false, error: deps.message, lifecycle: lifecycle.list() };
  }

  lifecycle.add('validating');
  const time = validateTimes(request.normalized.start, request.normalized.end);
  if (!time.ok) {
    await appendLog('warn', 'clip.time_validation_failed', { start: request.normalized.start, end: request.normalized.end, error: time.error });
    return { ok: false, error: time.error, lifecycle: lifecycle.list() };
  }

  const outputPath = validateOutputPath(request.normalized.savePath);
  if (!outputPath.ok) {
    await appendLog('warn', 'clip.output_path_invalid', { path: request.normalized.savePath, error: outputPath.error, details: outputPath.details });
    return { ok: false, error: outputPath.error, details: outputPath.details, lifecycle: lifecycle.list() };
  }

  lifecycle.add('processing', { step: 'resolve-output' });

  const config = applySettingsUpdate(await loadConfig(), {
    defaultSavePath: outputPath.resolvedPath,
    defaultFormat: request.normalized.format || '',
  });

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
    await appendLog('error', 'clip.wrapper_failed', {
      attempt,
      maxAttempts,
      message: envelope.error?.message,
      details: envelope.error?.details,
    });
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
  await appendLog('info', 'clip.completed', { file: envelope.result?.savedFile });
  return {
    ok: true,
    lifecycle: lifecycle.list(),
    file: envelope.result?.savedFile,
    usedArgs: envelope.result?.usedArgs,
  };
});

app.whenReady().then(async () => {
  await appendLog('info', 'app.ready', { platform: process.platform, version: app.getVersion() });
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
