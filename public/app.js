const form = document.getElementById('clip-form');
const statusEl = document.getElementById('status');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#b00020' : '#1b5e20';
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const config = await res.json();
  if (config.defaultSavePath) form.savePath.value = config.defaultSavePath;
}

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

  try {
    const res = await fetch('/api/clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed');
    setStatus(`Saved: ${data.file}`);
    form.name.value = '';
  } catch (err) {
    setStatus(`Error: ${err.message}`, true);
  }
});

loadConfig().catch(() => {});
