const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeConfig, applySettingsUpdate } = require('../src/core/config');

test('normalizeConfig applies defaults and trims persisted values', () => {
  const out = normalizeConfig({
    defaultSavePath: ' /tmp/clips ',
    defaultFormat: ' bestvideo+bestaudio/best ',
    counters: { '/tmp/clips': 2 },
  });

  assert.equal(out.defaultSavePath, '/tmp/clips');
  assert.equal(out.defaultFormat, 'bestvideo+bestaudio/best');
  assert.deepEqual(out.counters, { '/tmp/clips': 2 });
});

test('normalizeConfig guards invalid counters', () => {
  const out = normalizeConfig({ counters: null });
  assert.deepEqual(out.counters, {});
});

test('applySettingsUpdate updates only provided fields', () => {
  const out = applySettingsUpdate(
    { defaultSavePath: '/tmp/old', defaultFormat: 'best', counters: { a: 1 } },
    { defaultFormat: ' bestvideo ' }
  );

  assert.equal(out.defaultSavePath, '/tmp/old');
  assert.equal(out.defaultFormat, 'bestvideo');
  assert.deepEqual(out.counters, { a: 1 });
});
