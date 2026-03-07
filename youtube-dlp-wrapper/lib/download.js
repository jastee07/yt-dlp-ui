import { join } from 'node:path';

const VALID_CLIP_POLICIES = new Set(['auto', 'explicit']);

function createValidationError(field, message) {
  const error = new Error(message ?? `Missing required field: ${field}`);
  error.code = 'VALIDATION';
  return error;
}

export function validateDownloadPayload(payload = {}) {
  const { url, savePath, clipNamePolicy, clip = {}, outputHint } = payload;

  if (!url) {
    throw createValidationError('url');
  }

  if (!savePath) {
    throw createValidationError('savePath');
  }

  if (!clipNamePolicy) {
    throw createValidationError('clipNamePolicy');
  }

  if (!VALID_CLIP_POLICIES.has(clipNamePolicy)) {
    throw createValidationError('clipNamePolicy', 'clipNamePolicy must be "auto" or "explicit"');
  }

  if (clipNamePolicy === 'auto' && !clip.name && !outputHint) {
    throw createValidationError('outputHint', 'outputHint is required when clipNamePolicy is auto and clip name is missing');
  }

  return payload;
}

function sanitizeClipName(value) {
  const leaf = String(value ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .pop();

  return String(leaf ?? '')
    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
    .trim()
    .slice(0, 120);
}

function determineClipName({ clip = {}, clipNamePolicy, outputHint }) {
  const explicitName = sanitizeClipName(clip.name);
  if (explicitName) {
    return explicitName;
  }

  const hintedName = sanitizeClipName(outputHint);
  if (hintedName) {
    return hintedName;
  }

  if (clipNamePolicy === 'auto') {
    return 'clip';
  }

  return 'clip';
}

export function buildDownloadArgs(options) {
  const {
    url,
    savePath,
    clip = {},
    format,
    clipNamePolicy,
    outputHint
  } = options;

  validateDownloadPayload({ url, savePath, clipNamePolicy, clip, outputHint });

  const baseName = determineClipName({ clip, clipNamePolicy, outputHint });
  const outputTemplate = join(savePath, `${baseName}.%(ext)s`);

  const args = ['--output', outputTemplate];

  if (format) {
    args.push('--format', format);
  }

  if (clip.start && clip.end) {
    args.push('--download-sections', `*${clip.start}-${clip.end}`);
  }

  args.push(url);

  return args;
}
