import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { miraHtml } from './src/miraHtml';
import { authClient, API_BASE } from './src/auth';

const TOKEN_KEY = 'mira_token';

// The Mira Claude Design is a self-contained React doc (support.js loads React
// from unpkg and renders it). We render it verbatim in a WebView pointed at
// API_BASE so every fetch in the doc is same-origin (no CORS). We own auth: the
// doc's "Continue with Google" button posts {type:'signin'}; we run native
// Google sign-in (system browser, via @better-auth/expo), mint the bearer, store
// it, and remount the WebView with window.__MIRA_TOKEN set so the doc boots live.
//
// Every feature lives inside this WebView in its natural home (Home, Inbox,
// Flows, Store, Guard…). There is no parallel native nav — one app, one nav.
type SessionUser = { name?: string; email?: string; image?: string; emailVerified?: boolean };

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [nonce, setNonce] = useState(0);
  const webRef = useRef<WebView>(null);

  // The session token (raw better-auth token) doubles as the WebView's bearer —
  // the bearer plugin self-signs unsigned tokens. getSession() also yields the
  // user (email/name/image), which no /api/ig/* endpoint exposes — the Profile
  // page needs it, so we inject it as window.__MIRA_USER.
  const loadAuth = async (): Promise<{ token: string | null; user: SessionUser | null }> => {
    const s = await authClient.getSession();
    return { token: s?.data?.session?.token ?? null, user: (s?.data?.user as SessionUser) ?? null };
  };

  useEffect(() => {
    (async () => {
      // Use any stored token first so a getSession() failure never logs us out.
      let stored: string | null = null;
      try { stored = await SecureStore.getItemAsync(TOKEN_KEY); } catch {}
      if (stored) setToken(stored);
      setReady(true); // render immediately — don't block the UI on the network refresh
      // Then refresh token + user from the session in the background, non-fatally.
      try {
        const { token: fresh, user: u } = await loadAuth();
        if (fresh) {
          if (fresh !== stored) await SecureStore.setItemAsync(TOKEN_KEY, fresh);
          setToken(fresh);
        }
        if (u) setUser(u);
      } catch { /* offline / no session → keep stored token, or show sign-in */ }
    })();
  }, []);

  // Push the session user into the live WebView whenever it loads/changes — the
  // doc reads window.__MIRA_USER at mount, but user arrives async after mount.
  useEffect(() => {
    if (user && webRef.current) {
      webRef.current.injectJavaScript(
        `window.__miraSetUser && window.__miraSetUser(${JSON.stringify(JSON.stringify(user))}); true;`
      );
    }
  }, [user]);

  // Runs before the doc's JS, so api() has the bearer + user on first paint.
  const preload = `
    window.__MIRA_API = ${JSON.stringify(API_BASE)};
    window.__MIRA_TOKEN = ${JSON.stringify(token || '')};
    window.__MIRA_USER = ${JSON.stringify(JSON.stringify(user || null))};
    true;
  `;

  const onMessage = async (e: { nativeEvent: { data: string } }) => {
    let msg: { type?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    const m = msg as { type?: string; name?: string; email?: string };
    if (m.type === 'signin') {
      try {
        await authClient.signIn.social({ provider: 'google', callbackURL: 'miraapp://' });
        const { token: t, user: u } = await loadAuth();
        if (t) {
          await SecureStore.setItemAsync(TOKEN_KEY, t);
          setUser(u);
          setToken(t); // key change → WebView remounts → boots live
        } else {
          setNonce((n) => n + 1); // remount the sign-in screen (clears its spinner)
        }
      } catch {
        setNonce((n) => n + 1); // cancelled/failed → reset the stuck "Signing in…" state
      }
    } else if (m.type === 'signout') {
      authClient.signOut().catch(() => {});
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } else if (m.type === 'updateName' && m.name) {
      // name updates immediately; the doc already updated its own display optimistically
      authClient.updateUser({ name: m.name }).catch(() => {});
    } else if (m.type === 'changeEmail' && m.email) {
      // verified at the new address (sender logs the link in dev); doc shows a toast
      authClient.changeEmail({ newEmail: m.email, callbackURL: 'miraapp://' }).catch(() => {});
    }
  };

  if (!ready) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <WebView
        // remount when auth state flips so the new token is injected before content
        key={token ? 'in' : 'out-' + nonce}
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html: miraHtml, baseUrl: API_BASE }}
        injectedJavaScriptBeforeContentLoaded={preload}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        // bounces=false + locked html/body kill the web-page rubber-band pull; inner scrolls still work
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // matches the design's outer radial-gradient backdrop
  container: { flex: 1, backgroundColor: '#0c0d10' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
