// RN twin of apps/web/src/lib/api/client.ts. Not same-origin, so every path is
// prefixed with API_BASE and auth rides as a Bearer token (the better-auth
// session token in SecureStore), instead of a cookie. Same `api` surface so the
// ported hooks.ts works unchanged.
import * as SecureStore from 'expo-secure-store';
import RNEventSource from 'react-native-sse';
import { API_BASE } from '../auth';

const TOKEN_KEY = 'mira_token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  let token: string | null = null;
  try { token = await SecureStore.getItemAsync(TOKEN_KEY); } catch {}
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(await authHeaders()),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json())?.error ?? msg; } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  return (ct.includes('application/json') ? await res.json() : (await res.text())) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

// SSE: RN has no global EventSource. react-native-sse opens an authenticated
// stream (bearer header). Returns the source so the caller wires listeners +
// close(). Async because the token read is async.
export async function openStream(path: string): Promise<RNEventSource> {
  return new RNEventSource(API_BASE + path, { headers: await authHeaders() });
}
