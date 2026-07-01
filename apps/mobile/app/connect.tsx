import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Glass } from '../src/components/Glass';
import { Icon, type IconName } from '../src/components/Icon';
import { colors, radius, space, shadow } from '../src/theme';
import { API_BASE, getToken, signOut } from '../src/auth';

// Ported verbatim from Mira.dc.html's `connectFeatures` (design/Mira.dc.html:104-126,
// the dc-runtime controller that filled them) — was previously out of sync with the doc.
const FEATURES: { icon: IconName; text: string }[] = [
  { icon: 'chat', text: 'Auto-reply to comments in your voice' },
  { icon: 'sparkle', text: 'Learns your answers once, reuses everywhere' },
  { icon: 'link', text: 'DMs links to anyone who asks' },
];

// Connect Instagram. Ported from Mira.dc.html connect stage.
// ponytail: GET /api/ig/connect authenticates via cookie on web; mobile has only
// a bearer and a browser-opened URL can't carry it. Edge path (the test account
// is already connected → gate skips here). Upgrade: backend accepts ?token= for
// the mobile connect GET, or issue a one-time connect code.
export default function Connect() {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function onConnect() {
    if (busy) return;
    setBusy(true);
    try {
      const token = await getToken();
      const url = `${API_BASE}/api/ig/connect${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      await WebBrowser.openAuthSessionAsync(url, 'miraapp://');
      await qc.invalidateQueries({ queryKey: ['ig', 'status'] });
      router.replace('/'); // gate re-checks connection
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <LinearGradient colors={[colors.accent, colors.accentDeep]} style={styles.logo}>
          <Icon name="sparkle" size={40} color={colors.accentFg} />
        </LinearGradient>
        <Text style={styles.title}>Connect Instagram</Text>
        <Text style={styles.sub}>Mira manages your Instagram comments and DMs. Connect your account to begin.</Text>

        <Glass variant="light" style={styles.card}>
          <View style={styles.cardInner}>
            {FEATURES.map((f) => (
              <View key={f.text} style={styles.row}>
                <View style={styles.rowIcon}><Icon name={f.icon} size={15} color={colors.accentDeep} /></View>
                <Text style={styles.rowText}>{f.text}</Text>
              </View>
            ))}
            <Pressable onPress={onConnect} disabled={busy} style={styles.btn}>
              {busy ? <ActivityIndicator color={colors.accentFg} /> : <Text style={styles.btnLabel}>Connect Instagram</Text>}
            </Pressable>
          </View>
        </Glass>

        <View style={styles.trustRow}>
          <Icon name="shield" size={13} color={colors.textSubtle} />
          <Text style={styles.trustText}>Official Meta Graph API · your token stays on your device</Text>
        </View>

        <Pressable onPress={() => router.push('/(tabs)/home')} hitSlop={6}>
          <Text style={styles.preview}>Preview the app without connecting →</Text>
        </Pressable>

        <Pressable onPress={() => signOut().then(() => router.replace('/signin'))} style={styles.signout}>
          <Text style={styles.signoutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logo: { width: 64, height: 64, borderRadius: 19, alignItems: 'center', justifyContent: 'center', ...shadow.glass },
  title: { fontSize: 28, fontWeight: '600', color: colors.text, letterSpacing: -0.8, marginTop: 18 },
  sub: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginTop: 9, maxWidth: 300 },
  card: { width: '100%', marginTop: 24 },
  cardInner: { padding: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  rowIcon: {
    width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { fontSize: 13, color: colors.textMuted, flex: 1 },
  btn: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center', marginTop: space.sm,
  },
  btnLabel: { fontSize: 14.5, fontWeight: '500', color: colors.bgElev },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  trustText: { fontSize: 11.5, color: colors.textSubtle },
  preview: { fontSize: 12.5, color: colors.textSubtle, textDecorationLine: 'underline', marginTop: 16 },
  signout: { marginTop: 22, padding: 8 },
  signoutText: { fontSize: 13, color: colors.textSubtle },
});
