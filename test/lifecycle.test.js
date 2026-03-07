const test = require('node:test');
const assert = require('node:assert/strict');

const { createLifecycleTracker } = require('../src/core/lifecycle');

test('createLifecycleTracker records ordered states with timestamps', () => {
  const tracker = createLifecycleTracker();
  tracker.add('queued');
  tracker.add('processing', { step: 'validate' });

  const list = tracker.list();
  assert.equal(list.length, 2);
  assert.equal(list[0].state, 'queued');
  assert.match(list[0].at, /T/);
  assert.equal(list[1].state, 'processing');
  assert.equal(list[1].step, 'validate');
});
