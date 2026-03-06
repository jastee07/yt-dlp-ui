function summarizeDependencyStatus({ ytDlp, ffmpeg }) {
  const missing = [];
  if (!ytDlp) missing.push('yt-dlp');
  if (!ffmpeg) missing.push('ffmpeg');

  return {
    ok: missing.length === 0,
    missing,
    message:
      missing.length === 0
        ? 'All dependencies are installed.'
        : `Missing dependencies: ${missing.join(', ')}`,
  };
}

module.exports = { summarizeDependencyStatus };
