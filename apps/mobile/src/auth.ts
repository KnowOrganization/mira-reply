import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// API base = the Next/Elysia backend. OAuth runs server-side against the web
// Google client — no native Google client needed.
// Resolution order: EXPO_PUBLIC_API_BASE (inlined by Metro at bundle time —
// switchable without a native rebuild, unlike expoConfig.extra which is baked
// into the binary by `expo run:ios`) → app.json extra → ngrok fallback.
export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ||
  (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase ||
  'https://unveiled-walrus-blade.ngrok-free.dev';

// WEB_BASE = the Next web origin that serves the storefront pages (/s/*).
// Differs from API_BASE: local apiBase is :4000 (Elysia, API only) while Next
// dev is :3000; a tunnel/remote host fronts Next (serves /s/* AND proxies /api)
// so it's used as-is. Derive rule covers both; override with EXPO_PUBLIC_WEB_BASE
// or app.json extra.webBase.
function deriveWebBase(api: string): string {
  return api
    .replace('://localhost:4000', '://localhost:3000')
    .replace('://127.0.0.1:4000', '://127.0.0.1:3000');
}
export const WEB_BASE: string =
  process.env.EXPO_PUBLIC_WEB_BASE ||
  (Constants.expoConfig?.extra as { webBase?: string } | undefined)?.webBase ||
  deriveWebBase(API_BASE);

export const TOKEN_KEY = 'mira_token';
export const INTRO_SEEN_KEY = 'mira_intro_seen';

// expoClient opens the system browser for Google sign-in and handles the
// miraapp:// deep-link callback, persisting the session in SecureStore.
export const authClient = createAuthClient({
  baseURL: API_BASE,
  plugins: [
    expoClient({
      scheme: 'miraapp',
      storagePrefix: 'mira',
      storage: SecureStore,
    }),
  ],
});

export type SessionUser = { name?: string; email?: string; image?: string; emailVerified?: boolean };

/** Raw better-auth session token doubles as the API bearer (bearer plugin
 *  self-signs unsigned tokens). Also yields the user (no /api/ig/* exposes it). */
export async function loadSession(): Promise<{ token: string | null; user: SessionUser | null }> {
  const s = await authClient.getSession();
  return { token: s?.data?.session?.token ?? null, user: (s?.data?.user as SessionUser) ?? null };
}

export async function getToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}

/** Native Google sign-in → persist the bearer under TOKEN_KEY (the key the API
 *  client reads). Returns the token, or null on cancel/failure. */
export async function signInWithGoogle(): Promise<string | null> {
  await authClient.signIn.social({ provider: 'google', callbackURL: 'miraapp://' });
  const { token } = await loadSession();
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  return token;
}

export async function signOut(): Promise<void> {
  await authClient.signOut().catch(() => {});
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
}
