const path = require('path');

const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;

function toSeconds(t) {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function sanitizeName(name) {
  return String(name || '')
    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 120);
}

function validateTimes(start, end) {
  const s = String(start || '').trim();
  const e = String(end || '').trim();

  if (s && !TIME_RE.test(s)) return { ok: false, error: 'Start must be HH:MM:SS.' };
  if (e && !TIME_RE.test(e)) return { ok: false, error: 'End must be HH:MM:SS.' };
  if (s && e && toSeconds(e) <= toSeconds(s)) return { ok: false, error: 'End must be after start.' };

  return { ok: true, start: s, end: e };
}

function resolveClipName({ providedName, savePath, state }) {
  const name = sanitizeName(providedName);
  if (name) return { name };

  const key = path.resolve(savePath);
  const counters = state.counters || (state.counters = {});
  const next = (counters[key] || 0) + 1;
  counters[key] = next;
  return { name: `clip-${next}` };
}

function buildYtDlpArgs({ url, savePath, baseName, start, end }) {
  const args = ['-o', path.join(savePath, `${baseName}.%(ext)s`)];
  if (start || end) args.push('--download-sections', `*${start || ''}-${end || ''}`);
  args.push(url);
  return args;
}

module.exports = { validateTimes, resolveClipName, buildYtDlpArgs, sanitizeName };
