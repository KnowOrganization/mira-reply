import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// API base = the Next/Elysia backend over the ngrok tunnel. OAuth runs
// server-side against the web Google client — no native Google client needed.
export const API_BASE: string =
  (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase ||
  'https://unveiled-walrus-blade.ngrok-free.dev';

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
