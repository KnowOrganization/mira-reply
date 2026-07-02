import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Chip } from '../primitives';
import { LetterAvatar } from '../LetterAvatar';
import { colors, space } from '../../theme';
import { usePatchConversation, type CrmConversationListItem } from '../../api/hooks';

// Long-press context sheet — every whitelisted PATCH field one gesture deep:
// per-thread autonomy, folder, notes, close. Autonomous mode is owner-gated
// server-side; a 403 surfaces as a toast-style alert.

const SNAP_POINTS = ['52%'];
const FOLDERS = ['primary', 'general', 'requests'] as const;
const AI_MODES = ['assisted', 'autonomous'] as const;

export type ConversationSheetHandle = {
  present: (c: CrmConversationListItem) => void;
  dismiss: () => void;
};

export const ConversationSheet = forwardRef<ConversationSheetHandle>((_props, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [c, setC] = useState<CrmConversationListItem | null>(null);
  const [notes, setNotes] = useState('');
  const patch = usePatchConversation();

  useImperativeHandle(ref, () => ({
    present: (conv) => {
      setC(conv);
      setNotes(conv.notes ?? '');
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  function apply(fields: Record<string, unknown>, optimistic?: Partial<CrmConversationListItem>) {
    if (!c) return;
    if (optimistic) setC({ ...c, ...optimistic });
    patch.mutate(
      { id: c.id, patch: fields },
      {
        onError: (e) => {
          const msg = e instanceof Error ? e.message : 'Update failed';
          Alert.alert(msg.includes('owner') || msg.includes('admin') ? 'Owner only' : 'Update failed', msg);
        },
      },
    );
  }

  const name = c?.display_name?.trim() || (c?.igsid ? `@${c.igsid}` : 'Conversation');

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="extend"
    >
      <BottomSheetView style={styles.body}>
        {c ? (
          <>
            <View style={styles.head}>
              <LetterAvatar id={c.igsid || c.id} name={c.display_name} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <View style={styles.tagRow}>
                  {c.lead_status !== 'none' ? <Chip label={c.lead_status} tone="warm" small /> : null}
                  {c.tags?.slice(0, 3).map((t) => <Chip key={t} label={t} tone="grey" small />)}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Mira's autonomy on this thread</Text>
            <View style={styles.chipRow}>
              {AI_MODES.map((m) => {
                const active = c.ai_mode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => apply({ ai_mode: m }, { ai_mode: m })}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Folder</Text>
            <View style={styles.chipRow}>
              {FOLDERS.map((f) => {
                const active = c.folder === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => apply({ folder: f }, { folder: f })}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{f}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Notes</Text>
            <BottomSheetTextInput
              value={notes}
              onChangeText={setNotes}
              onBlur={() => { if (notes !== (c.notes ?? '')) apply({ notes }); }}
              placeholder="Add a note for your team…"
              placeholderTextColor={colors.textSubtle}
              multiline
              style={styles.notes}
            />

            <Pressable
              onPress={() => { apply({ status: 'closed' }); sheetRef.current?.dismiss(); }}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>Close conversation</Text>
            </Pressable>
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
ConversationSheet.displayName = 'ConversationSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  pressed: { opacity: 0.7 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.lg },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  tagRow: { flexDirection: 'row', gap: 5, marginTop: 4 },
  label: {
    fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle,
    textTransform: 'uppercase', marginBottom: 7, marginTop: space.sm,
  },
  chipRow: { flexDirection: 'row', gap: 7, marginBottom: space.xs },
  option: {
    paddingHorizontal: 14, height: 32, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElev,
    alignItems: 'center', justifyContent: 'center',
  },
  optionActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionText: { fontSize: 12.5, fontWeight: '500', color: colors.textMuted, textTransform: 'capitalize' },
  optionTextActive: { color: colors.accentDeep },
  notes: {
    minHeight: 60, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElev,
    borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13.5, color: colors.text, textAlignVertical: 'top',
  },
  closeBtn: { marginTop: space.lg, alignItems: 'center', paddingVertical: 10 },
  closeText: { fontSize: 13.5, fontWeight: '500', color: colors.stBlocked },
});
