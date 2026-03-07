const form = document.getElementById('clip-form');
const statusEl = document.getElementById('status');
const depsEl = document.getElementById('deps');
const metadataEl = document.getElementById('metadata');
const logsPathEl = document.getElementById('logs-path');
const openLogsBtn = document.getElementById('open-logs');
const pickFolderBtn = document.getElementById('pick-folder');
const fetchMetadataBtn = document.getElementById('fetch-metadata');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#b00020' : '#1b5e20';
}

function userHintFromError(message = '') {
  if (/Save path is required/i.test(message)) return `${message} Use “Choose…” to set an output folder.`;
  if (/Missing dependencies/i.test(message)) return `${message} Install yt-dlp + ffmpeg, then relaunch.`;
  return message;
}

function setDepsStatus(deps) {
  depsEl.textContent = deps.message;
  depsEl.className = `deps ${deps.ok ? 'ok' : 'bad'}`;
}

function setBusy(isBusy) {
  form.querySelectorAll('input,button').forEach((el) => {
    el.disabled = isBusy;
  });
  openLogsBtn.disabled = isBusy;
}

function renderMetadata(metadata) {
  if (!metadata) {
    metadataEl.textContent = '';
    return;
  }

  const title = metadata.title || '(no title)';
  const duration = metadata.duration_string || metadata.duration || 'unknown duration';
  metadataEl.textContent = `Ready: ${title} · ${duration}`;
}

function formatLifecycle(lifecycle = []) {
  if (!Array.isArray(lifecycle) || lifecycle.length === 0) return '';
  const states = lifecycle.map((entry) => {
    if (typeof entry === 'string') return entry;
    const state = entry.state || 'unknown';
    if (entry.attempt && entry.maxAttempts) return `${state} (${entry.attempt}/${entry.maxAttempts})`;
    return state;
  });
  return `\nLifecycle: ${states.join(' → ')}`;
}

async function persistSettings() {
  await window.clipper.updateSettings({
    defaultSavePath: form.savePath.value.trim(),
    defaultFormat: form.format.value.trim(),
  });
}

async function boot() {
  setStatus('Starting app… checking dependencies and loading settings.');

  const [config, deps, logsInfo] = await Promise.all([
    window.clipper.getConfig(),
    window.clipper.checkDeps(),
    window.clipper.getLogsInfo(),
  ]);

  if (config.defaultSavePath) form.savePath.value = config.defaultSavePath;
  if (config.defaultFormat) form.format.value = config.defaultFormat;

  if (logsInfo?.ok) logsPathEl.textContent = `Log file: ${logsInfo.path}`;

  setDepsStatus(deps);
  if (deps.ok) {
    setStatus('Ready. Paste a YouTube URL to fetch metadata or save a clip.');
  } else {
    setStatus(userHintFromError(deps.message), true);
  }
}

openLogsBtn.addEventListener('click', async () => {
  const opened = await window.clipper.openLogsFolder();
  if (!opened.ok) setStatus(`Error opening logs folder: ${opened.error}`, true);
});

pickFolderBtn.addEventListener('click', async () => {
  const result = await window.clipper.pickFolder();
  if (result.ok) {
    form.savePath.value = result.path;
    await persistSettings();
  }
});

form.savePath.addEventListener('blur', () => {
  persistSettings().catch((error) => setStatus(`Error: ${error.message}`, true));
});

form.format.addEventListener('blur', () => {
  persistSettings().catch((error) => setStatus(`Error: ${error.message}`, true));
});

fetchMetadataBtn.addEventListener('click', async () => {
  const url = form.url.value.trim();
  if (!url) return setStatus('Add a URL first.', true);

  setStatus('Fetching metadata...');
  setBusy(true);
  try {
    const result = await window.clipper.fetchMetadata({ url, savePath: form.savePath.value.trim() });
    if (!result.ok) {
      renderMetadata(null);
      return setStatus(`Error: ${userHintFromError(result.error)}`, true);
    }

    renderMetadata(result.metadata);
    setStatus('Metadata loaded.');
  } finally {
    setBusy(false);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('Queued...');

  const payload = {
    url: form.url.value.trim(),
    savePath: form.savePath.value.trim(),
    name: form.name.value.trim(),
    start: form.start.value.trim(),
    end: form.end.value.trim(),
    format: form.format.value.trim(),
  };

  setBusy(true);
  try {
    const result = await window.clipper.runClip(payload);
    if (!result.ok) {
      const retry = result.attempt ? `\nAttempt: ${result.attempt}/${result.maxAttempts || result.attempt}` : '';
      return setStatus(`Error: ${userHintFromError(result.error)}${retry}${formatLifecycle(result.lifecycle)}`, true);
    }

    await persistSettings();
    setStatus(`Saved: ${result.file}${formatLifecycle(result.lifecycle)}`);
    form.name.value = '';
  } finally {
    setBusy(false);
  }
});

boot().catch((e) => setStatus(`Startup error: ${e.message}`, true));
