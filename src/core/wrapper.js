const path = require('path');
const { spawn } = require('child_process');

const WRAPPER_CLI = path.join(__dirname, '..', '..', 'youtube-dlp-wrapper', 'bin', 'cli.js');

function runWrapperCommand(command, payload, spawnImpl = spawn) {
  return new Promise((resolve) => {
    const args = [WRAPPER_CLI, command, '--payload', JSON.stringify(payload || {})];
    const child = spawnImpl(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        resolve({ ok: false, error: { code: 'PROCESS', message: stderr || `Wrapper failed (${code})` } });
        return;
      }

      try {
        const envelope = JSON.parse(stdout.trim() || '{}');
        if (!envelope.ok && stderr && !envelope.error?.details?.stderr) {
          envelope.error = envelope.error || { code: 'PROCESS', message: 'Wrapper command failed' };
          envelope.error.details = { ...(envelope.error.details || {}), stderr };
        }
        resolve(envelope);
      } catch (error) {
        resolve({
          ok: false,
          error: {
            code: 'INTERNAL',
            message: 'Failed to parse wrapper response',
            details: { stdout, stderr, source: String(error.message || error) },
          },
        });
      }
    });
  });
}

module.exports = { runWrapperCommand, WRAPPER_CLI };
