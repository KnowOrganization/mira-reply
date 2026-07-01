import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import BottomSheetModal, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Icon } from '../Icon';
import { colors, radius, space } from '../../theme';
import type { AutomationNodeType } from '@shaiz/shared';

// Flow-builder sheet (doc: Mira.dc.html:1263-1366) — 3 modes: Picker (choose a
// node type), Config (dynamic field list per node), Test (simulated chat).
// Generic shell: the flow builder screen drives which mode/payload to show.

export type FieldDef = { key: string; label: string; type: 'text' | 'textarea' | 'number'; placeholder?: string };
export type TestMessage = { from: 'user' | 'mira'; text: string };

export type BuilderSheetHandle = {
  presentPicker: (onPick: (type: AutomationNodeType) => void) => void;
  presentConfig: (title: string, fields: FieldDef[], initial: Record<string, string>, onSave: (values: Record<string, string>) => void) => void;
  presentTest: (messages: TestMessage[]) => void;
  dismiss: () => void;
};

const NODE_GROUPS: { label: string; items: { type: AutomationNodeType; label: string; desc: string }[] }[] = [
  {
    label: 'Messaging',
    items: [
      { type: 'comment_reply', label: 'Public reply', desc: 'Reply on the comment itself' },
      { type: 'text_message', label: 'Send DM', desc: 'A text message in DMs' },
      { type: 'card_message', label: 'Card message', desc: 'Image + button DM card' },
      { type: 'opening_message', label: 'Opening message', desc: "First message when a DM starts" },
      { type: 'followup_message', label: 'Follow-up', desc: 'Send after a delay' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { type: 'ask_follow', label: 'Ask to follow', desc: 'Prompt before continuing' },
      { type: 'follow_gate', label: 'Follow gate', desc: 'Require a follow to proceed' },
      { type: 'lead_form', label: 'Lead form', desc: 'Capture email/phone' },
      { type: 'post_filter', label: 'Post filter', desc: 'Only run on specific posts' },
    ],
  },
  {
    label: 'Funnel Studio',
    items: [
      { type: 'giveaway', label: 'Giveaway', desc: 'Capture entries + confirm' },
      { type: 'discount_code', label: 'Discount code', desc: 'Issue a unique code' },
      { type: 'quiz', label: 'Quiz', desc: 'Match answer → tailored reply' },
      { type: 'tag_reward', label: 'Tag reward', desc: 'Reward N-friend tags' },
      { type: 'ab_split', label: 'A/B split', desc: 'Split + measure variants' },
      { type: 'price_reply', label: 'Price lookup', desc: 'Reply with product price' },
    ],
  },
];

type Mode = { kind: 'picker'; onPick: (t: AutomationNodeType) => void }
  | { kind: 'config'; title: string; fields: FieldDef[]; values: Record<string, string>; onSave: (v: Record<string, string>) => void }
  | { kind: 'test'; messages: TestMessage[] }
  | null;

export const BuilderSheet = forwardRef<BuilderSheetHandle>((_props, ref) => {
  const sheetRef = useRef<any>(null);
  const [mode, setMode] = useState<Mode>(null);

  useImperativeHandle(ref, () => ({
    presentPicker: (onPick) => { setMode({ kind: 'picker', onPick }); sheetRef.current?.present(); },
    presentConfig: (title, fields, initial, onSave) => {
      setMode({ kind: 'config', title, fields, values: initial, onSave });
      sheetRef.current?.present();
    },
    presentTest: (messages) => { setMode({ kind: 'test', messages }); sheetRef.current?.present(); },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const [draft, setDraft] = useState<Record<string, string>>({});
  const startConfig = useCallback((m: Extract<Mode, { kind: 'config' }>) => setDraft(m.values), []);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['70%']}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      onChange={(i) => { if (i === -1) setMode(null); }}
    >
      <BottomSheetView style={styles.body}>
        {mode?.kind === 'picker' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Add a step</Text>
            {NODE_GROUPS.map((g) => (
              <View key={g.label} style={{ marginBottom: space.lg }}>
                <Text style={styles.groupLabel}>{g.label}</Text>
                {g.items.map((it) => (
                  <Pressable
                    key={it.type}
                    style={styles.pickRow}
                    onPress={() => { mode.onPick(it.type); sheetRef.current?.dismiss(); }}
                  >
                    <View style={styles.pickIcon}><Icon name="sparkle" size={16} color={colors.accentDeep} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickLabel}>{it.label}</Text>
                      <Text style={styles.pickDesc}>{it.desc}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        {mode?.kind === 'config' && (() => {
          if (Object.keys(draft).length === 0 && Object.keys(mode.values).length) startConfig(mode);
          return (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{mode.title}</Text>
              {mode.fields.map((f) => (
                <View key={f.key} style={{ marginBottom: space.md }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    value={draft[f.key] ?? mode.values[f.key] ?? ''}
                    onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textSubtle}
                    keyboardType={f.type === 'number' ? 'number-pad' : 'default'}
                    multiline={f.type === 'textarea'}
                    style={[styles.input, f.type === 'textarea' && styles.inputMulti]}
                  />
                </View>
              ))}
              <Pressable
                style={styles.doneBtn}
                onPress={() => { mode.onSave({ ...mode.values, ...draft }); setDraft({}); sheetRef.current?.dismiss(); }}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </ScrollView>
          );
        })()}

        {mode?.kind === 'test' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Test run</Text>
            {mode.messages.map((m, i) => (
              <View key={i} style={[styles.bubbleRow, m.from === 'user' && styles.bubbleRowUser]}>
                <View style={[styles.bubble, m.from === 'mira' ? styles.bubbleMira : styles.bubbleUser]}>
                  <Text style={[styles.bubbleText, m.from === 'user' && styles.bubbleTextUser]}>{m.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
BuilderSheet.displayName = 'BuilderSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: space.md },

  groupLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: space.sm },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  pickIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  pickLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  pickDesc: { fontSize: 11.5, color: colors.textSubtle, marginTop: 1 },

  fieldLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5, color: colors.text, backgroundColor: colors.bgElev,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  doneBtn: { height: 48, borderRadius: 13, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: space.sm, marginBottom: space.lg },
  doneBtnText: { fontSize: 14.5, fontWeight: '600', color: colors.accentFg },

  bubbleRow: { flexDirection: 'row', marginBottom: space.sm },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 },
  bubbleMira: { backgroundColor: colors.accentSoft, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.bgInset, borderBottomRightRadius: 4, alignSelf: 'flex-end' },
  bubbleText: { fontSize: 13.5, color: colors.text, lineHeight: 18 },
  bubbleTextUser: { color: colors.text },
});
