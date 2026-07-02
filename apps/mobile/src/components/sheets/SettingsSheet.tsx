import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { Toggle } from '../primitives';
import { colors, radius, space } from '../../theme';
import { useStatus } from '../../api/hooks';
import { loadSession, signOut, type SessionUser } from '../../auth';

// Settings sheet (doc: Mira.dc.html:1237-1260) — account header, Preferences
// toggles, Disconnect. Opened from Home's avatar + Profile's Reply-mode row.
const SNAP_POINTS = ['55%'];

export type SettingsSheetHandle = { present: () => void; dismiss: () => void };

export const SettingsSheet = forwardRef<SettingsSheetHandle>((_props, ref) => {
  // BottomSheetModal's ref type is a generic React-19 ref-as-prop that
  // ElementRef/ComponentRef can't resolve cleanly — `any` here is simpler
  // than fighting the library's types for two method calls.
  const sheetRef = useRef<any>(null);
  const router = useRouter();
  const { data: status } = useStatus();
  const [user, setUser] = useState<SessionUser | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  useEffect(() => {
    loadSession().then((s) => setUser(s.user)).catch(() => {});
  }, []);

  // ponytail: local-only toggles for now — no backend field for AI
  // disclosure/autonomous-mode/push yet; wire to settings + push registration
  // when those land.
  const [aiDisclosure, setAiDisclosure] = useState(true);
  const [autonomous, setAutonomous] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.body}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? user?.email ?? '?').trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Your account'}</Text>
            <View style={styles.connRow}>
              <View style={[styles.dot, status?.connected && styles.dotOn]} />
              <Text style={styles.connText}>
                {status?.account?.username ? `@${status.account.username}` : 'Not connected'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.section}>Preferences</Text>
        <View style={styles.listCard}>
          <Row label="AI disclosure" sub="Tell people they're talking to Mira" value={aiDisclosure} onChange={setAiDisclosure} />
          <Row label="Autonomous mode" sub="Send replies without approval" value={autonomous} onChange={setAutonomous} last={false} />
          <Row label="Push notifications" sub="New drafts and opportunities" value={pushEnabled} onChange={setPushEnabled} last />
        </View>

        <Pressable
          style={styles.disconnectBtn}
          onPress={async () => {
            sheetRef.current?.dismiss();
            await signOut();
            router.replace('/signin');
          }}
        >
          <Text style={styles.disconnectText}>Disconnect Instagram</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
SettingsSheet.displayName = 'SettingsSheet';

function Row({ label, sub, value, onChange, last = true }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={{ flex: 1, marginRight: space.md }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Toggle value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },

  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600', color: colors.accentDeep },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSubtle },
  dotOn: { backgroundColor: colors.stDone },
  connText: { fontSize: 12.5, color: colors.textMuted },

  section: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: space.sm },
  listCard: { backgroundColor: colors.bgInset, borderRadius: 13, marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', padding: space.md },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 11.5, color: colors.textSubtle, marginTop: 1 },

  disconnectBtn: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  disconnectText: { fontSize: 14.5, fontWeight: '500', color: colors.text },
});
