const form = document.getElementById('clip-form');
const statusEl = document.getElementById('status');
const depsEl = document.getElementById('deps');
const pickFolderBtn = document.getElementById('pick-folder');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#b00020' : '#1b5e20';
}

function setDepsStatus(deps) {
  depsEl.textContent = deps.message;
  depsEl.className = `deps ${deps.ok ? 'ok' : 'bad'}`;
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('Running yt-dlp...');

  const payload = {
    url: form.url.value.trim(),
    savePath: form.savePath.value.trim(),
    name: form.name.value.trim(),
    start: form.start.value.trim(),
    end: form.end.value.trim(),
  };

  if (!payload.savePath) {
    return setStatus('Error: Save folder path is required to download a clip.', true);
  }

  const result = await window.clipper.runClip(payload);
  if (!result.ok) return setStatus(`Error: ${result.error}`, true);

  setStatus(`Saved: ${result.file}`);
  form.name.value = '';
});

boot().catch((e) => setStatus(`Error: ${e.message}`, true));
