import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Chip, type ChipTone } from '../primitives';
import { Icon } from '../Icon';
import { colors, space } from '../../theme';
import type { CrmConversationListItem } from '../../api/hooks';

// Why Mira did what she did — full decision trace for one conversation.
// Transparency at zero backend cost: the fields already ride the list payload.

const SNAP_POINTS = ['40%'];

export type DecisionTraceSheetHandle = {
  present: (c: CrmConversationListItem) => void;
  dismiss: () => void;
};

function riskTone(risk: string | null): ChipTone {
  return risk === 'high' ? 'blocked' : risk === 'medium' ? 'warm' : 'done';
}

export const DecisionTraceSheet = forwardRef<DecisionTraceSheetHandle>((_props, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [c, setC] = useState<CrmConversationListItem | null>(null);

  useImperativeHandle(ref, () => ({
    present: (conv) => { setC(conv); sheetRef.current?.present(); },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.body}>
        <View style={styles.head}>
          <View style={styles.tile}><Icon name="sparkle" size={15} color={colors.accentDeep} /></View>
          <Text style={styles.title}>Mira's reasoning</Text>
        </View>
        {c ? (
          <>
            <View style={styles.chips}>
              {c.ai_decision ? <Chip label={c.ai_decision} tone="accent" small /> : null}
              {c.ai_risk ? <Chip label={`${c.ai_risk} risk`} tone={riskTone(c.ai_risk)} small /> : null}
              {c.ai_confidence != null ? (
                <Chip label={`${Math.round(c.ai_confidence * 100)}% confident`} tone={c.ai_confidence >= 0.8 ? 'done' : c.ai_confidence >= 0.6 ? 'grey' : 'warm'} small />
              ) : null}
            </View>
            <Text style={styles.reason}>
              {c.ai_reason?.trim() || 'No reasoning recorded for this draft.'}
            </Text>
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
DecisionTraceSheet.displayName = 'DecisionTraceSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: space.md },
  tile: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: space.md },
  reason: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
});
