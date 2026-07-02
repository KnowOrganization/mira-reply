import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors, space } from '../../theme';

// Edit Mira's draft before sending — 3 taps instead of skip-and-retype.
// Sending an edited draft goes through the normal human-send path, which
// consumes the parked draft server-side.

const SNAP_POINTS = ['55%'];

export type EditDraftSheetHandle = {
  present: (draft: string, onSend: (text: string) => Promise<void>) => void;
  dismiss: () => void;
};

export const EditDraftSheet = forwardRef<EditDraftSheetHandle>((_props, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSendRef = useRef<((t: string) => Promise<void>) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (draft, onSend) => {
      setText(draft);
      setError(null);
      setSending(false);
      onSendRef.current = onSend;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  async function send() {
    if (!text.trim() || sending || !onSendRef.current) return;
    setSending(true);
    setError(null);
    try {
      await onSendRef.current(text.trim());
      sheetRef.current?.dismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    }
    setSending(false);
  }

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
        <Text style={styles.title}>Edit Mira's draft</Text>
        <BottomSheetTextInput
          value={text}
          onChangeText={setText}
          multiline
          style={styles.input}
          placeholder="Your reply…"
          placeholderTextColor={colors.textSubtle}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          style={({ pressed }) => [styles.sendBtn, (pressed || sending || !text.trim()) && styles.pressed]}
        >
          {sending ? <ActivityIndicator color={colors.accentFg} /> : <Text style={styles.sendText}>Send</Text>}
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
EditDraftSheet.displayName = 'EditDraftSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: space.md },
  input: {
    minHeight: 110, maxHeight: 220,
    borderWidth: 1, borderColor: 'rgba(90,95,224,0.25)', backgroundColor: colors.accentSoft,
    borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14.5, lineHeight: 20, color: colors.text, textAlignVertical: 'top',
  },
  error: { marginTop: space.sm, fontSize: 12.5, color: colors.stBlocked },
  sendBtn: {
    marginTop: space.md, height: 48, borderRadius: 13, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  sendText: { fontSize: 14.5, fontWeight: '600', color: colors.accentFg },
  pressed: { opacity: 0.6 },
});
