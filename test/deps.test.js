const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeDependencyStatus } = require('../src/core/deps');

test('summarizeDependencyStatus returns ok true when deps exist', () => {
  const out = summarizeDependencyStatus({ ytDlp: true, ffmpeg: true });
  assert.equal(out.ok, true);
  assert.deepEqual(out.missing, []);
});

test('summarizeDependencyStatus flags missing binaries', () => {
  const out = summarizeDependencyStatus({ ytDlp: false, ffmpeg: true });
  assert.equal(out.ok, false);
  assert.deepEqual(out.missing, ['yt-dlp']);
  assert.match(out.message, /yt-dlp/);
});
