import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Glass } from '../src/components/Glass';
import { colors, radius, space, shadow } from '../src/theme';
import { signInWithGoogle } from '../src/auth';

// Welcome + native Google sign-in. Ported from Mira.dc.html sign-in stage.
export default function SignIn() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSignIn() {
    if (busy) return;
    setBusy(true);
    try {
      const token = await signInWithGoogle();
      if (token) router.replace('/'); // gate re-evaluates → connect or tabs
    } catch {
      /* cancelled / failed */
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <LinearGradient colors={[colors.accent, colors.accentDeep]} style={styles.logo}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <Path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5 10.1 11.9 4.5 10l5.6-1.4L12 3Z" fill={colors.accentFg} />
          </Svg>
        </LinearGradient>
        <Text style={styles.title}>Welcome to Mira</Text>
        <Text style={styles.sub}>Sign in to connect your Instagram and automate replies.</Text>

        <Pressable onPress={onSignIn} disabled={busy} style={styles.btnWrap}>
          <Glass variant="smoke" radius={radius.pill} style={styles.btn}>
            {busy ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <Path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
              </Svg>
            )}
            <Text style={styles.btnLabel}>{busy ? 'Signing in…' : 'Continue with Google'}</Text>
          </Glass>
        </Pressable>
      </View>
      <Text style={styles.terms}>By continuing you agree to our Terms · Privacy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  logo: {
    width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    ...shadow.glass,
  },
  title: { fontSize: 28, fontWeight: '600', color: colors.text, letterSpacing: -0.8, marginTop: 26 },
  sub: { fontSize: 14.5, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 10, maxWidth: 280 },
  btnWrap: { width: '100%', maxWidth: 320, marginTop: 30 },
  btn: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  btnLabel: { fontSize: 15, fontWeight: '500', color: colors.glassText },
  terms: { textAlign: 'center', fontSize: 11.5, color: colors.textSubtle, paddingBottom: 40 },
});
