export function getMlServiceUrl() {
  return process.env.ML_SERVICE_URL || process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://127.0.0.1:8000';
}

export function mlEndpoint(path: string) {
  const base = getMlServiceUrl().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
