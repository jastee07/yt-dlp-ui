import test from 'node:test';
import assert from 'node:assert/strict';
import { runCommand } from '../lib/commands.js';

test('runCommand should reject unknown commands', async () => {
  const response = await runCommand({ command: 'unknown', payload: {} });
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'VALIDATION');
});

test('metadata command should return parsed yt-dlp JSON result', async () => {
  const response = await runCommand({
    command: 'metadata',
    payload: { url: 'https://www.youtube.com/watch?v=abc123' },
    execute: async () => ({ exitCode: 0, stdout: '{"title":"Demo","duration":42}', stderr: '' })
  });

  assert.equal(response.ok, true);
  assert.equal(response.command, 'metadata');
  assert.equal(response.result.title, 'Demo');
  assert.equal(response.result.duration, 42);
});

test('download command should return savedFile and usedArgs', async () => {
  const response = await runCommand({
    command: 'download',
    payload: {
      url: 'https://www.youtube.com/watch?v=clip123',
      savePath: '/tmp/clips',
      clipNamePolicy: 'auto',
      outputHint: 'clip-base'
    },
    execute: async ({ args }) => ({ exitCode: 0, stdout: '', stderr: '', args })
  });

  assert.equal(response.ok, true);
  assert.equal(response.command, 'download');
  assert.match(response.result.savedFile, /\/tmp\/clips\/clip-base/);
  assert.ok(Array.isArray(response.result.usedArgs));
  assert.equal(response.result.usedArgs.at(-1), 'https://www.youtube.com/watch?v=clip123');
});

test('process errors should map to PROCESS envelope', async () => {
  const response = await runCommand({
    command: 'download',
    payload: {
      url: 'https://www.youtube.com/watch?v=clip123',
      savePath: '/tmp/clips',
      clipNamePolicy: 'auto',
      outputHint: 'clip-base'
    },
    execute: async () => ({ exitCode: 1, stdout: '', stderr: 'network error' })
  });

  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'PROCESS');
  assert.equal(response.error.details.exitCode, 1);
});
