const fs = require('fs');
const path = require('path');

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

function isValidYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (!YT_HOSTS.has(parsed.hostname)) return false;
    if (parsed.hostname === 'youtu.be') return parsed.pathname.length > 1;
    return parsed.pathname === '/watch' && parsed.searchParams.has('v');
  } catch {
    return false;
  }
}

function validateClipRequest(payload = {}) {
  const errors = [];
  const normalized = {
    url: String(payload.url || '').trim(),
    savePath: String(payload.savePath || '').trim(),
    name: String(payload.name || '').trim(),
    start: String(payload.start || '').trim(),
    end: String(payload.end || '').trim(),
    format: String(payload.format || '').trim(),
  };

  if (!isValidYouTubeUrl(normalized.url)) {
    errors.push('Please enter a valid YouTube watch URL.');
  }

  if (!normalized.savePath) {
    errors.push('Save path is required.');
  }

  return { ok: errors.length === 0, errors, normalized };
}

function validateOutputPath(savePath) {
  const resolved = path.resolve(savePath);
  try {
    fs.mkdirSync(resolved, { recursive: true });
    fs.accessSync(resolved, fs.constants.W_OK);
    return { ok: true, resolvedPath: resolved };
  } catch (error) {
    return {
      ok: false,
      error: `Output folder is not writable: ${resolved}`,
      details: String(error.message || error),
    };
  }
}

module.exports = { isValidYouTubeUrl, validateClipRequest, validateOutputPath };
