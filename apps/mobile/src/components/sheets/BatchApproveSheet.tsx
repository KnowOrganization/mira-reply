import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LetterAvatar } from '../LetterAvatar';
import { colors, space } from '../../theme';
import { haptics } from '../../lib/haptics';
import type { CrmConversationListItem } from '../../api/hooks';

// Batch approve: clear the day's low-risk, high-confidence drafts in one
// gesture. Sends run sequentially; a per-item failure (e.g. 409 window closed)
// marks that row and continues — the batch never fails as a whole.

const SNAP_POINTS = ['60%'];

export type BatchApproveSheetHandle = {
  present: (items: CrmConversationListItem[], send: (id: string, text: string) => Promise<void>) => void;
  dismiss: () => void;
};

type RowState = 'queued' | 'sending' | 'sent' | 'failed';

export const BatchApproveSheet = forwardRef<BatchApproveSheetHandle>((_props, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [items, setItems] = useState<CrmConversationListItem[]>([]);
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [running, setRunning] = useState(false);
  const sendRef = useRef<((id: string, text: string) => Promise<void>) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (list, send) => {
      setItems(list);
      setStates(Object.fromEntries(list.map((c) => [c.id, 'queued' as RowState])));
      setRunning(false);
      sendRef.current = send;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  async function run() {
    if (running || !sendRef.current) return;
    setRunning(true);
    for (const c of items) {
      if (!c.ai_draft) continue;
      setStates((s) => ({ ...s, [c.id]: 'sending' }));
      try {
        await sendRef.current(c.id, c.ai_draft);
        setStates((s) => ({ ...s, [c.id]: 'sent' }));
      } catch {
        setStates((s) => ({ ...s, [c.id]: 'failed' }));
      }
    }
    haptics.success();
    setRunning(false);
  }

  const doneCount = Object.values(states).filter((s) => s === 'sent').length;
  const allDone = !running && doneCount > 0 && Object.values(states).every((s) => s === 'sent' || s === 'failed');

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Approve {items.length} drafts</Text>
        <Text style={styles.sub}>All high-confidence, low-risk, windows open. Review the list, then send in one go.</Text>
        {items.map((c) => {
          const st = states[c.id] ?? 'queued';
          return (
            <View key={c.id} style={styles.row}>
              <LetterAvatar id={c.igsid || c.id} name={c.display_name} size={28} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {c.display_name?.trim() || `@${c.igsid}`}
                </Text>
                <Text style={styles.rowDraft} numberOfLines={1}>{c.ai_draft}</Text>
              </View>
              {st === 'sending' ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : st === 'sent' ? (
                <Text style={styles.rowOk}>✓</Text>
              ) : st === 'failed' ? (
                <Text style={styles.rowFail}>window closed</Text>
              ) : null}
            </View>
          );
        })}
        <Pressable
          onPress={allDone ? () => sheetRef.current?.dismiss() : run}
          disabled={running}
          style={({ pressed }) => [styles.btn, (pressed || running) && styles.pressed]}
        >
          {running ? (
            <ActivityIndicator color={colors.accentFg} />
          ) : (
            <Text style={styles.btnText}>{allDone ? 'Done' : `Send all ${items.length}`}</Text>
          )}
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
BatchApproveSheet.displayName = 'BatchApproveSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl },
  pressed: { opacity: 0.6 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, marginBottom: space.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowName: { fontSize: 13.5, fontWeight: '500', color: colors.text },
  rowDraft: { fontSize: 12, color: colors.textSubtle, marginTop: 1 },
  rowOk: { fontSize: 15, fontWeight: '700', color: colors.stDone },
  rowFail: { fontSize: 11, color: colors.stBlocked },
  btn: {
    marginTop: space.lg, height: 48, borderRadius: 13, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 14.5, fontWeight: '600', color: colors.accentFg },
});
