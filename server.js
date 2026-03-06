const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 4876;
const app = express();

const DATA_DIR = path.join(__dirname, '.data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;

function toSeconds(t) {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_ ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 120);
}

async function loadConfig() {
  try {
    const raw = await fsp.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { defaultSavePath: '', counters: {} };
  }
}

async function saveConfig(config) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function runWrapperCommand(command, payload) {
  const wrapperCliPath = path.join(__dirname, 'youtube-dlp-wrapper', 'bin', 'cli.js');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [wrapperCliPath, command, '--payload', JSON.stringify(payload)], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', () => {
      try {
        const envelope = JSON.parse(stdout || '{}');
        resolve({ envelope, stderr });
      } catch (error) {
        reject(new Error(`Wrapper returned invalid JSON: ${stdout || stderr || String(error)}`));
      }
    });
  });
}

app.get('/api/config', async (_req, res) => {
  const config = await loadConfig();
  res.json(config);
});

app.post('/api/clip', async (req, res) => {
  try {
    let { url, savePath, name, start, end } = req.body || {};

    if (!url || typeof url !== 'string' || !url.includes('youtube.com/watch')) {
      return res.status(400).json({ ok: false, error: 'Invalid YouTube watch URL.' });
    }

    if (!savePath || typeof savePath !== 'string') {
      return res.status(400).json({ ok: false, error: 'savePath is required.' });
    }

    start = (start || '').trim();
    end = (end || '').trim();

    if (start && !TIME_RE.test(start)) return res.status(400).json({ ok: false, error: 'Start must be HH:MM:SS.' });
    if (end && !TIME_RE.test(end)) return res.status(400).json({ ok: false, error: 'End must be HH:MM:SS.' });
    if (start && end && toSeconds(end) <= toSeconds(start)) {
      return res.status(400).json({ ok: false, error: 'End must be after start.' });
    }

    await fsp.mkdir(savePath, { recursive: true });

    const config = await loadConfig();
    config.defaultSavePath = savePath;

    const key = path.resolve(savePath);
    const counters = config.counters || {};

    let baseName = sanitizeName((name || '').trim());
    if (!baseName) {
      const next = (counters[key] || 0) + 1;
      baseName = `clip-${next}`;
      counters[key] = next;
    }

    config.counters = counters;
    await saveConfig(config);

    const hasExplicitName = Boolean(sanitizeName((name || '').trim()));
    const clipPayload = {};
    if (start) clipPayload.start = start;
    if (end) clipPayload.end = end;
    if (hasExplicitName) clipPayload.name = baseName;

    const wrapperPayload = {
      url,
      savePath,
      clipNamePolicy: hasExplicitName ? 'explicit' : 'auto',
      outputHint: baseName,
      clip: clipPayload
    };

    const { envelope } = await runWrapperCommand('download', wrapperPayload);

    if (!envelope?.ok) {
      const message = envelope?.error?.message || 'Clip download failed';
      const details = envelope?.error?.details;
      const statusCode = envelope?.error?.code === 'VALIDATION' ? 400 : 500;
      return res.status(statusCode).json({ ok: false, error: message, details });
    }

    return res.json({ ok: true, file: envelope.result?.savedFile || path.join(savePath, baseName), wrapper: envelope.result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Unknown error' });
  }
});

app.listen(PORT, () => {
  console.log(`YouTube Clipper running at http://127.0.0.1:${PORT}`);
});
