#!/usr/bin/env node
import process from 'node:process';

const [, , command, ...rest] = process.argv;
const payloadFlagIndex = rest.indexOf('--payload');
const rawPayload = payloadFlagIndex !== -1 ? rest[payloadFlagIndex + 1] : undefined;

function jsonError({ command, requestId, code, message, details } = {}) {
  const envelope = {
    ok: false,
    command,
    requestId,
    error: {
      code,
      message,
      details
    }
  };
  console.log(JSON.stringify(envelope));
  process.exitCode = 1;
}

let payload;
try {
  payload = rawPayload ? JSON.parse(rawPayload) : {};
} catch (error) {
  jsonError({ code: 'VALIDATION', message: 'Unable to parse payload JSON', details: { original: String(error) } });
  process.exit(1);
}

if (!command) {
  jsonError({ code: 'VALIDATION', message: 'Missing command' });
  process.exit(1);
}

jsonError({ command, requestId: payload?.requestId, code: 'INTERNAL', message: 'Not implemented yet' });
