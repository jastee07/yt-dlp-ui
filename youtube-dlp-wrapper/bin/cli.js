#!/usr/bin/env node
import process from 'node:process';
import { runCommand } from '../lib/commands.js';

const [, , command, ...rest] = process.argv;
const payloadFlagIndex = rest.indexOf('--payload');
const rawPayload = payloadFlagIndex !== -1 ? rest[payloadFlagIndex + 1] : undefined;

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

function parsePayload(raw) {
  if (!raw || !raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

async function main() {
  const stdinRaw = await readStdin();
  const source = rawPayload ?? stdinRaw;

  let payload;
  try {
    payload = parsePayload(source);
  } catch (error) {
    console.log(JSON.stringify({
      ok: false,
      command,
      error: {
        code: 'VALIDATION',
        message: 'Unable to parse payload JSON',
        details: { source: String(error) }
      }
    }));
    process.exitCode = 1;
    return;
  }

  if (!command) {
    console.log(JSON.stringify({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Missing command'
      }
    }));
    process.exitCode = 1;
    return;
  }

  const envelope = await runCommand({ command, payload });
  console.log(JSON.stringify(envelope));
  process.exitCode = envelope.ok ? 0 : 1;
}

main();
