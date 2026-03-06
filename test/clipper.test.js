const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateTimes,
  resolveClipName,
  buildYtDlpArgs,
} = require('../src/core/clipper');

test('validateTimes accepts blank start/end', () => {
  const out = validateTimes('', '');
  assert.equal(out.ok, true);
});

test('validateTimes rejects bad format', () => {
  const out = validateTimes('1:02:03', '');
  assert.equal(out.ok, false);
  assert.match(out.error, /HH:MM:SS/);
});

test('validateTimes rejects end <= start', () => {
  const out = validateTimes('00:01:00', '00:00:59');
  assert.equal(out.ok, false);
  assert.match(out.error, /after start/i);
});

test('resolveClipName uses provided name when valid', () => {
  const state = { counters: {} };
  const out = resolveClipName({ providedName: 'my clip', savePath: '/tmp/clips', state });
  assert.equal(out.name, 'my-clip');
  assert.equal(state.counters['/tmp/clips'], undefined);
});

test('resolveClipName auto-increments clip-n per folder', () => {
  const state = { counters: {} };
  const a = resolveClipName({ providedName: '', savePath: '/tmp/clips', state });
  const b = resolveClipName({ providedName: '', savePath: '/tmp/clips', state });
  assert.equal(a.name, 'clip-1');
  assert.equal(b.name, 'clip-2');
});

test('buildYtDlpArgs creates section args only when range provided', () => {
  const full = buildYtDlpArgs({
    url: 'https://www.youtube.com/watch?v=abc',
    savePath: '/tmp/clips',
    baseName: 'clip-1',
    start: '',
    end: '',
  });
  assert.deepEqual(full, ['-o', '/tmp/clips/clip-1.%(ext)s', 'https://www.youtube.com/watch?v=abc']);

  const ranged = buildYtDlpArgs({
    url: 'https://www.youtube.com/watch?v=abc',
    savePath: '/tmp/clips',
    baseName: 'clip-2',
    start: '00:00:10',
    end: '00:00:20',
  });
  assert.deepEqual(ranged, [
    '-o',
    '/tmp/clips/clip-2.%(ext)s',
    '--download-sections',
    '*00:00:10-00:00:20',
    'https://www.youtube.com/watch?v=abc',
  ]);
});
