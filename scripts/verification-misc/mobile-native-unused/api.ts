// Native API client — the same /api/ig/* backend the WebView and web app use,
// authed with the bearer token we mint on Google sign-in (stored in SecureStore).
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './auth';

const TOKEN_KEY = 'mira_token';

export async function api<T = unknown>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  let token: string | null = null;
  try { token = await SecureStore.getItemAsync(TOKEN_KEY); } catch {}
  const res = await fetch(API_BASE + path, {
    method: opts?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error('http ' + res.status);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T,>(p: string) => api<T>(p);
export const apiPost = <T,>(p: string, body?: unknown) => api<T>(p, { method: 'POST', body });
export const apiPatch = <T,>(p: string, body?: unknown) => api<T>(p, { method: 'PATCH', body });
export const apiDel = <T,>(p: string) => api<T>(p, { method: 'DELETE' });
