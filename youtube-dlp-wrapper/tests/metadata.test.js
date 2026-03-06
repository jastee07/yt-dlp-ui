import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMetadataArgs, validateMetadataPayload } from '../lib/metadata.js';

const EXAMPLE_URL = 'https://www.youtube.com/watch?v=abc123';

test('metadata args should include yt-dlp JSON flags', () => {
  const args = buildMetadataArgs(EXAMPLE_URL);
  assert.deepStrictEqual(args, [
    '-J',
    '--no-warnings',
    '--skip-download',
    EXAMPLE_URL
  ]);
});

test('metadata validation should reject missing url', () => {
  assert.throws(
    () => validateMetadataPayload({}),
    {
      name: 'Error',
      message: /Missing required field: url/i,
      code: 'VALIDATION'
    }
  );
});
