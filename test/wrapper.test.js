const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { runWrapperCommand } = require('../src/core/wrapper');

function createSpawnStub({ code = 0, stdout = '{}', stderr = '' } = {}) {
  return () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();

    process.nextTick(() => {
      if (stdout) child.stdout.emit('data', Buffer.from(stdout));
      if (stderr) child.stderr.emit('data', Buffer.from(stderr));
      child.emit('close', code);
    });

    return child;
  };
}

test('runWrapperCommand resolves parsed envelope on success', async () => {
  const envelope = { ok: true, command: 'metadata', result: { title: 'Demo' } };
  const out = await runWrapperCommand('metadata', { url: 'https://www.youtube.com/watch?v=abc' }, createSpawnStub({ stdout: JSON.stringify(envelope) }));
  assert.equal(out.ok, true);
  assert.equal(out.result.title, 'Demo');
});

test('runWrapperCommand returns parse error for invalid stdout', async () => {
  const out = await runWrapperCommand('download', {}, createSpawnStub({ stdout: 'not-json', code: 1 }));
  assert.equal(out.ok, false);
  assert.equal(out.error.code, 'INTERNAL');
});

test('runWrapperCommand returns process error if wrapper exits with no stdout', async () => {
  const out = await runWrapperCommand('download', {}, createSpawnStub({ stdout: '', stderr: 'boom', code: 1 }));
  assert.equal(out.ok, false);
  assert.equal(out.error.code, 'PROCESS');
});
