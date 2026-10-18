// Small fetch wrapper for the Carbon backend. Adds the signed-in user's token.
import { authHeaders, getAccessToken } from './auth';

const isDev = import.meta.env.DEV;
export const API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '') ||
  (isDev ? 'http://localhost:3002' : 'https://carbon-backend-a1sg.onrender.com');

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    Object.assign(headers, authHeaders());
  }
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('Could not reach Carbon. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

export const fileUrl = (path) => (path ? `${API_URL}${path}` : null);

// Wakes the analysis service (it sleeps when idle). Fire and forget.
export const warmUp = () => {
  fetch(`${API_URL}/api/warm`).catch(() => {});
};
