import { spawn } from 'node:child_process';

function createError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export function executeYtDlp({ args, env = {}, timeoutMs = 90_000 } = {}) {
  return new Promise((resolve, reject) => {
    const command = env?.YTDLP_PATH || process.env.YTDLP_PATH || 'yt-dlp';
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...env
      }
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      if (error?.code === 'ENOENT') {
        reject(createError('DEPENDENCY', 'yt-dlp executable not found', { command }));
        return;
      }

      reject(createError('INTERNAL', 'Failed to start yt-dlp process', { source: String(error) }));
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(createError('TIMEOUT', 'yt-dlp process timed out', { timeoutMs }));
        return;
      }

      resolve({ exitCode, stdout, stderr });
    });
  });
}
