import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { buildDownloadArgs } from '../lib/download.js';

const SAVE_PATH = '/tmp/clips';
const VIDEO_URL = 'https://www.youtube.com/watch?v=clip123';

test('download args should include output template, format, and sections', () => {
  const args = buildDownloadArgs({
    url: VIDEO_URL,
    savePath: SAVE_PATH,
    clip: {
      name: 'Episode 01',
      start: '00:01:00',
      end: '00:02:30'
    },
    format: 'bestvideo+bestaudio/best',
    clipNamePolicy: 'explicit'
  });

  assert.deepStrictEqual(args, [
    '--output',
    join(SAVE_PATH, 'Episode 01.%(ext)s'),
    '--format',
    'bestvideo+bestaudio/best',
    '--download-sections',
    '*00:01:00-00:02:30',
    VIDEO_URL
  ]);
});

test('download args should fallback to output hint when clip name missing', () => {
  const args = buildDownloadArgs({
    url: VIDEO_URL,
    savePath: SAVE_PATH,
    clip: {},
    clipNamePolicy: 'auto',
    outputHint: 'clip-base'
  });

  assert.deepStrictEqual(args, [
    '--output',
    join(SAVE_PATH, 'clip-base.%(ext)s'),
    VIDEO_URL
  ]);
});
