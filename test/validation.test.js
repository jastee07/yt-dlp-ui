const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const {
  isValidYouTubeUrl,
  validateClipRequest,
  validateOutputPath,
} = require('../src/core/validation');

test('isValidYouTubeUrl accepts watch and youtu.be urls', () => {
  assert.equal(isValidYouTubeUrl('https://www.youtube.com/watch?v=abc123'), true);
  assert.equal(isValidYouTubeUrl('https://youtu.be/abc123'), true);
});

test('isValidYouTubeUrl rejects non-youtube urls', () => {
  assert.equal(isValidYouTubeUrl('https://example.com/watch?v=abc123'), false);
});

test('validateClipRequest normalizes payload and returns errors', () => {
  const bad = validateClipRequest({ url: 'bad', savePath: '' });
  assert.equal(bad.ok, false);
  assert.match(bad.errors[0], /valid YouTube watch URL/i);

  const good = validateClipRequest({
    url: 'https://www.youtube.com/watch?v=abc123',
    savePath: ' /tmp/clips ',
    name: ' demo ',
  });

  assert.equal(good.ok, true);
  assert.equal(good.normalized.savePath, '/tmp/clips');
  assert.equal(good.normalized.name, 'demo');
});

test('validateOutputPath validates writable directories', () => {
  const okDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytui-'));
  const out = validateOutputPath(okDir);
  assert.equal(out.ok, true);
  assert.equal(out.resolvedPath, path.resolve(okDir));
});
