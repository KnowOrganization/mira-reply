import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Icon } from '../Icon';
import { colors, space } from '../../theme';
import { useStatus, useSetChannelMode } from '../../api/hooks';
import { haptics } from '../../lib/haptics';

// Mira's employment contract for DMs — shadow / assisted / auto — explained
// before committing. Account-level dmMode via the existing modes endpoint.

const SNAP_POINTS = ['45%'];

const MODES = [
  { key: 'shadow', label: 'Shadow', desc: 'Mira watches and learns. Nothing is drafted or sent.' },
  { key: 'assisted', label: 'Assisted', desc: 'Mira drafts every reply — you approve each one here.' },
  { key: 'auto', label: 'Auto', desc: 'Mira sends high-confidence replies herself and only asks when unsure.' },
] as const;

export type AutonomySheetHandle = { present: () => void; dismiss: () => void };

export const AutonomySheet = forwardRef<AutonomySheetHandle>((_props, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { data: status } = useStatus<{ dmMode?: string }>();
  const setMode = useSetChannelMode();

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const current = status?.dmMode ?? 'assisted';

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.body}>
        <Text style={styles.title}>How much should Mira handle?</Text>
        {MODES.map((m) => {
          const active = current === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => {
                haptics.select();
                setMode.mutate({ dmMode: m.key });
              }}
              style={[styles.row, active && styles.rowActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{m.label}</Text>
                <Text style={styles.rowDesc}>{m.desc}</Text>
              </View>
              {active && <Icon name="check" size={16} color={colors.accentDeep} />}
            </Pressable>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
AutonomySheet.displayName = 'AutonomySheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: space.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 13, borderWidth: 1, borderColor: 'transparent', marginBottom: 6,
  },
  rowActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  rowDesc: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
});
