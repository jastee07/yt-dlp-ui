const form = document.getElementById('clip-form');
const statusEl = document.getElementById('status');
const depsEl = document.getElementById('deps');
const metadataEl = document.getElementById('metadata');
const pickFolderBtn = document.getElementById('pick-folder');
const fetchMetadataBtn = document.getElementById('fetch-metadata');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#b00020' : '#1b5e20';
}

function setDepsStatus(deps) {
  depsEl.textContent = deps.message;
  depsEl.className = `deps ${deps.ok ? 'ok' : 'bad'}`;
}

function setBusy(isBusy) {
  form.querySelectorAll('input,button').forEach((el) => {
    el.disabled = isBusy;
  });
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
  return `\nLifecycle: ${lifecycle.join(' → ')}`;
}

async function boot() {
  const [config, deps] = await Promise.all([
    window.clipper.getConfig(),
    window.clipper.checkDeps(),
  ]);

  if (config.defaultSavePath) form.savePath.value = config.defaultSavePath;
  setDepsStatus(deps);
}

pickFolderBtn.addEventListener('click', async () => {
  const result = await window.clipper.pickFolder();
  if (result.ok) form.savePath.value = result.path;
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
      return setStatus(`Error: ${result.error}`, true);
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
      return setStatus(`Error: ${result.error}${retry}${formatLifecycle(result.lifecycle)}`, true);
    }

    setStatus(`Saved: ${result.file}${formatLifecycle(result.lifecycle)}`);
    form.name.value = '';
  } finally {
    setBusy(false);
  }
});

boot().catch((e) => setStatus(`Error: ${e.message}`, true));
