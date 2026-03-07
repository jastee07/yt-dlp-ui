import { join } from 'node:path';
import { buildDownloadArgs, validateDownloadPayload } from './download.js';
import { buildMetadataArgs, validateMetadataPayload } from './metadata.js';
import { executeYtDlp } from './process.js';

const DEFAULT_TIMEOUT_MS = 90_000;

function okEnvelope({ command, requestId, result }) {
  return { ok: true, command, requestId, result };
}

function errorEnvelope({ command, requestId, code, message, details }) {
  return {
    ok: false,
    command,
    requestId,
    error: { code, message, details }
  };
}

function toErrorEnvelope({ command, requestId, error }) {
  if (error?.code && ['VALIDATION', 'DEPENDENCY', 'PROCESS', 'TIMEOUT', 'INTERNAL'].includes(error.code)) {
    return errorEnvelope({
      command,
      requestId,
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  return errorEnvelope({
    command,
    requestId,
    code: 'INTERNAL',
    message: 'Unexpected wrapper failure',
    details: { source: String(error?.message || error) }
  });
}

function getMaxAttempts(payload = {}) {
  const retryCount = Number.isInteger(payload.retryCount) ? payload.retryCount : 0;
  return Math.max(1, retryCount + 1);
}

async function executeWithRetries({ execute, args, env, timeoutMs, maxAttempts }) {
  let last = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    last = await execute({ args, env, timeoutMs });
    if (last.exitCode === 0) {
      return { ...last, attempt, maxAttempts };
    }

    if (attempt === maxAttempts) {
      return { ...last, attempt, maxAttempts };
    }
  }

  return { ...(last || {}), attempt: maxAttempts, maxAttempts };
}

export async function runCommand({ command, payload = {}, execute = executeYtDlp } = {}) {
  const requestId = payload?.requestId;

  try {
    if (command === 'metadata') {
      const validated = validateMetadataPayload(payload);
      const args = buildMetadataArgs(validated.url);
      const proc = await executeWithRetries({
        execute,
        args,
        env: payload.env,
        timeoutMs: payload.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxAttempts: getMaxAttempts(payload)
      });

      if (proc.exitCode !== 0) {
        return errorEnvelope({
          command,
          requestId,
          code: 'PROCESS',
          message: 'yt-dlp metadata command failed',
          details: {
            exitCode: proc.exitCode,
            stderr: proc.stderr,
            attempt: proc.attempt,
            maxAttempts: proc.maxAttempts
          }
        });
      }

      let result;
      try {
        result = JSON.parse(proc.stdout || '{}');
      } catch (error) {
        return errorEnvelope({
          command,
          requestId,
          code: 'INTERNAL',
          message: 'Unable to parse yt-dlp metadata JSON',
          details: { source: String(error) }
        });
      }

      return okEnvelope({ command, requestId, result });
    }

    if (command === 'download') {
      const validated = validateDownloadPayload(payload);
      const args = buildDownloadArgs(validated);
      const proc = await executeWithRetries({
        execute,
        args,
        env: payload.env,
        timeoutMs: payload.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxAttempts: getMaxAttempts(payload)
      });

      if (proc.exitCode !== 0) {
        return errorEnvelope({
          command,
          requestId,
          code: 'PROCESS',
          message: 'yt-dlp download command failed',
          details: {
            exitCode: proc.exitCode,
            stderr: proc.stderr,
            attempt: proc.attempt,
            maxAttempts: proc.maxAttempts
          }
        });
      }

      const baseName = payload.clip?.name?.trim() || payload.outputHint || 'clip';
      return okEnvelope({
        command,
        requestId,
        result: {
          savedFile: join(payload.savePath, baseName),
          usedArgs: args
        }
      });
    }

    return errorEnvelope({
      command,
      requestId,
      code: 'VALIDATION',
      message: 'Unknown command'
    });
  } catch (error) {
    return toErrorEnvelope({ command, requestId, error });
  }
}
