export function buildMetadataArgs(url) {
  return [
    '-J',
    '--no-warnings',
    '--skip-download',
    url
  ];
}

export function validateMetadataPayload(payload = {}) {
  const url = payload.url;
  if (!url) {
    const error = new Error('Missing required field: url');
    error.code = 'VALIDATION';
    throw error;
  }

  return { url, forceRefresh: payload.forceRefresh ?? false, requestId: payload.requestId };
}
