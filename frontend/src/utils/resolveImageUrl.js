import { API_BASE_URL } from './api';

export function resolveImageUrl(url) {
  if (!url) return url;
  if (typeof url !== 'string') return url;

  // Locally uploaded media is stored as a path like "/uploads/...".
  // In dev, the frontend runs on :3000 and backend on :5000, so we must prefix it.
  if (url.startsWith('/uploads/')) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
}
