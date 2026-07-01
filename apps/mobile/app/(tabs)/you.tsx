import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/Card';
import { SectionLabel, Stat, Toggle } from '../../src/components/primitives';
import { colors, space } from '../../src/theme';
import { loadSession, signOut, type SessionUser } from '../../src/auth';
import { useStatus, useDisconnect } from '../../src/api/hooks';
import { SkProfileHeader } from '../../src/components/skeleton/units';

function cap(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// status carries the IG counts on some accounts but they're not in the typed
// shape — read them loosely and fall back to "—" when absent.
function count(v: unknown): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '—';
}

export default function You() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: status } = useStatus();
  const disconnect = useDisconnect();
  const [user, setUser] = useState<SessionUser | null>(null);

  // ponytail: local-only toggles for now — no backend field for AI
  // disclosure/autonomous-mode/push yet; wire to settings + push
  // registration when those land.
  const [aiDisclosure, setAiDisclosure] = useState(true);
  const [autonomous, setAutonomous] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    loadSession()
      .then((s) => {
        if (active) setUser(s.user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const username = status?.account?.username;
  const connected = !!status?.connected;
  const commentMode = status?.commentMode ?? 'shadow';
  const brainReady = !!status?.brainReady;
  const factCount = status?.factCount ?? 0;

  const counts = (status ?? {}) as Record<string, unknown>;
  const followers = count(counts.followersCount);
  const following = count(counts.followingCount);
  const posts = count(counts.postsCount ?? counts.mediaCount);

  const displayName = user?.name ?? 'Your account';
  const initial = (user?.name ?? user?.email ?? '?').trim().charAt(0).toUpperCase() || '?';

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: insets.top + space.lg,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header — centered, not a card */}
        {!user ? (
          <SkProfileHeader />
        ) : (
          <View style={styles.header}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[colors.accent, colors.accentDeep]}
                style={[styles.avatar, styles.avatarFallback]}
              >
                <Text style={styles.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.subLine}>
              <View style={[styles.subDot, connected && styles.subDotOn]} />
              <Text style={styles.subText} numberOfLines={1}>
                {(username ? `@${username}` : 'No account') + ' · ' + (connected ? 'Connected' : 'Not connected')}
              </Text>
            </View>
          </View>
        )}

        {/* Stat grid */}
        <View style={styles.statGrid}>
          <Card radius={15} style={styles.statCard}>
            <Stat align="center" size={20} value={followers} label="Followers" weight="600" labelSize={11} letterSpacing={-0.4} />
          </Card>
          <Card radius={15} style={styles.statCard}>
            <Stat align="center" size={20} value={following} label="Following" weight="600" labelSize={11} letterSpacing={-0.4} />
          </Card>
          <Card radius={15} style={styles.statCard}>
            <Stat align="center" size={20} value={posts} label="Posts" weight="600" labelSize={11} letterSpacing={-0.4} />
          </Card>
        </View>

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <Card radius={15} style={styles.listCard}>
          <Row label="Email" value={user?.email ?? '—'} last={false} />
          <Row label="Display name" value={displayName} action="Edit" last={false} />
          <Row
            label="Instagram"
            value={username ? `@${username}` : 'Not connected'}
            action={connected ? 'Connected' : undefined}
            last={false}
          />
          <Row label="Workspace" value="Free · Owner" action="Change" last />
        </Card>

        {/* Mira */}
        <SectionLabel>Mira</SectionLabel>
        <Card radius={15} style={styles.listCard}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Reply mode</Text>
              <Text style={styles.rowValue}>Comments &amp; DMs</Text>
            </View>
            <Text style={styles.rowValueRight}>{cap(commentMode)}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Brain</Text>
              <Text style={styles.rowValue}>{factCount} facts learned</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.dot, brainReady && styles.dotOn]} />
              <Text style={styles.rowValueRight}>{brainReady ? 'Ready' : 'Building'}</Text>
            </View>
          </View>
        </Card>

        {/* Preferences — inline on this page, not a sheet */}
        <SectionLabel>Preferences</SectionLabel>
        <Card radius={15} style={styles.listCard}>
          <ToggleRow label="AI disclosure" sub="Tell people they're talking to Mira" value={aiDisclosure} onChange={setAiDisclosure} />
          <ToggleRow label="Autonomous mode" sub="Send replies without approval" value={autonomous} onChange={setAutonomous} />
          <ToggleRow label="Push notifications" sub="New drafts and opportunities" value={pushEnabled} onChange={setPushEnabled} last />
        </Card>

        {/* Actions */}
        <Pressable
          style={styles.btn}
          disabled={disconnect.isPending}
          onPress={() => disconnect.mutate(undefined, { onSuccess: () => router.replace('/connect') })}
        >
          <Text style={styles.btnText}>{disconnect.isPending ? 'Disconnecting…' : 'Disconnect Instagram'}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSignOut]} onPress={handleSignOut}>
          <Text style={[styles.btnText, styles.btnSignOutText]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ label, sub, value, onChange, last }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowText}>
        <Text style={styles.rowValue}>{label}</Text>
        <Text style={styles.rowLabel}>{sub}</Text>
      </View>
      <Toggle value={value} onValueChange={onChange} />
    </View>
  );
}

function Row({
  label,
  value,
  action,
  last,
}: {
  label: string;
  value: string;
  action?: string;
  last: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={() => {}} hitSlop={8}>
          <Text style={styles.rowLink}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  title: { fontSize: 26, fontWeight: '600', letterSpacing: -0.78, color: colors.text, marginBottom: 14 },

  header: { alignItems: 'center', gap: 11, paddingVertical: 20 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 10,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: '500', color: '#fff' },
  name: { fontSize: 20, fontWeight: '600', letterSpacing: -0.4, color: colors.text, textAlign: 'center' },
  subLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  subDotOn: { backgroundColor: colors.stDone },
  subText: { fontSize: 13, color: colors.textMuted },

  statGrid: { flexDirection: 'row', gap: 11, marginBottom: 18 },
  statCard: { flex: 1, padding: 13, alignItems: 'center' },

  listCard: { padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebed',
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowLabel: { fontSize: 11.5, color: colors.textSubtle },
  rowValue: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValueRight: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowLink: { fontSize: 13, fontWeight: '500', color: colors.accent },

  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotOn: { backgroundColor: colors.stDone },

  btn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebed',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  btnText: { fontSize: 14.5, fontWeight: '500', color: '#18181b' },
  btnSignOut: { marginTop: 10 },
  btnSignOutText: { color: '#d14343', fontWeight: '600' },
});
