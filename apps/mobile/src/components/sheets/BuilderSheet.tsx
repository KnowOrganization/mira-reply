import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Icon, type IconName } from '../Icon';
import { colors, radius, space } from '../../theme';
import type { AutomationNodeType, AutomationTrigger, AutomationTriggerType } from '@shaiz/shared';

// Flow-builder sheet (doc: Mira.dc.html:1263-1366) — 4 modes: Picker (choose a
// node type), Config (dynamic field list per node), Trigger (type + filters in
// one place), Test (real dry-run chat). Generic shell: the flow builder screen
// drives which mode/payload to show.

export type FieldDef = { key: string; label: string; type: 'text' | 'textarea' | 'number'; placeholder?: string };
export type TestMessage = { from: 'user' | 'mira'; text: string };
// Shape of /api/ig/posts items (mirrors web's PostSummary).
export type PostPick = { id: string; caption?: string; thumbnailUrl?: string; mediaUrl?: string };

export type BuilderSheetHandle = {
  presentPicker: (onPick: (type: AutomationNodeType) => void) => void;
  presentConfig: (title: string, fields: FieldDef[], initial: Record<string, string>, onSave: (values: Record<string, string>) => void, note?: string) => void;
  presentTrigger: (current: AutomationTrigger, onSave: (t: AutomationTrigger) => void) => void;
  presentTest: (initialText: string, onRun: (text: string) => Promise<TestMessage[]>) => void;
  dismiss: () => void;
};

// One icon per node type — used on picker rows here and step cards in the
// builder, so a step looks the same in both places.
export const NODE_ICONS: Record<AutomationNodeType, IconName> = {
  trigger: 'sparkle',
  post_filter: 'pipeline',
  opening_message: 'message',
  text_message: 'send',
  card_message: 'orders',
  image_message: 'instagram',
  comment_reply: 'chat',
  ask_follow: 'bell',
  follow_gate: 'shield',
  lead_form: 'user',
  followup_message: 'clock',
  giveaway: 'target',
  discount_code: 'tag',
  quiz: 'check',
  tag_reward: 'megaphone',
  ab_split: 'automations',
  price_reply: 'trendUp',
};

const TRIGGER_OPTIONS: { type: AutomationTriggerType; label: string; desc: string }[] = [
  { type: 'comment_post', label: 'Comment on a post', desc: 'Someone comments on your post or reel' },
  { type: 'dm', label: 'Direct message', desc: 'Someone sends you a DM' },
  { type: 'live_comment', label: 'Live comment', desc: 'Someone comments during your live' },
  { type: 'story_reply', label: 'Story reply', desc: 'Someone replies to your story' },
];

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
      // post_filter is structural — post scoping lives on the trigger (post
      // picker in the Trigger sheet), matching web where it's never user-added.
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

// Stable reference — an inline snapPoints literal makes @gorhom/bottom-sheet
// re-measure every render and auto-present a ghost backdrop on mount.
const SNAP_POINTS = ['70%'];

type Mode = { kind: 'picker'; onPick: (t: AutomationNodeType) => void }
  | { kind: 'config'; title: string; fields: FieldDef[]; values: Record<string, string>; onSave: (v: Record<string, string>) => void; note?: string }
  | { kind: 'trigger'; onSave: (t: AutomationTrigger) => void }
  | { kind: 'test'; initialText: string; onRun: (text: string) => Promise<TestMessage[]> }
  | null;

export const BuilderSheet = forwardRef<BuilderSheetHandle>((_props, ref) => {
  const sheetRef = useRef<any>(null);
  const [mode, setMode] = useState<Mode>(null);

  useImperativeHandle(ref, () => ({
    presentPicker: (onPick) => { setMode({ kind: 'picker', onPick }); sheetRef.current?.present(); },
    presentConfig: (title, fields, initial, onSave, note) => {
      setMode({ kind: 'config', title, fields, values: initial, onSave, note });
      sheetRef.current?.present();
    },
    presentTrigger: (current, onSave) => {
      setMode({ kind: 'trigger', onSave });
      setTrigType(current.type);
      setTrigKeywords((current.keywords ?? []).join(', '));
      setTrigPostIds(current.postIds ?? []);
      sheetRef.current?.present();
    },
    presentTest: (initialText, onRun) => {
      setMode({ kind: 'test', initialText, onRun });
      setTestText(initialText);
      setTestResults(null);
      setTestError(null);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const [trigType, setTrigType] = useState<AutomationTriggerType>('comment_post');
  const [trigKeywords, setTrigKeywords] = useState('');
  // Post selection lives inline on the builder page ("Runs on" section) — the
  // sheet only passes existing ids through so a type/keyword edit can't wipe them.
  const [trigPostIds, setTrigPostIds] = useState<string[]>([]);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const startConfig = useCallback((m: Extract<Mode, { kind: 'config' }>) => setDraft(m.values), []);

  const [testText, setTestText] = useState('');
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestMessage[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function runTest(m: Extract<Mode, { kind: 'test' }>) {
    if (!testText.trim() || testRunning) return;
    setTestRunning(true);
    setTestError(null);
    try {
      const results = await m.onRun(testText);
      setTestResults(results);
    } catch {
      setTestError('Test failed to run.');
      setTestResults(null);
    }
    setTestRunning(false);
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      onChange={(i) => { if (i === -1) setMode(null); }}
    >
      <BottomSheetView style={styles.body}>
        {mode?.kind === 'picker' && (
          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
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
                    <View style={styles.pickIcon}><Icon name={NODE_ICONS[it.type]} size={16} color={colors.accentDeep} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickLabel}>{it.label}</Text>
                      <Text style={styles.pickDesc}>{it.desc}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </BottomSheetScrollView>
        )}

        {mode?.kind === 'config' && (() => {
          if (Object.keys(draft).length === 0 && Object.keys(mode.values).length) startConfig(mode);
          return (
            <BottomSheetScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{mode.title}</Text>
              {mode.note && (
                <View style={styles.aiNote}>
                  <Icon name="sparkle" size={14} color={colors.accentDeep} />
                  <Text style={styles.aiNoteText}>{mode.note}</Text>
                </View>
              )}
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
            </BottomSheetScrollView>
          );
        })()}

        {mode?.kind === 'trigger' && (
          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>When should this run?</Text>
            {TRIGGER_OPTIONS.map((opt) => {
              const active = trigType === opt.type;
              return (
                <Pressable
                  key={opt.type}
                  style={[styles.trigRow, active && styles.trigRowActive]}
                  onPress={() => setTrigType(opt.type)}
                >
                  <View style={[styles.pickIcon, active && styles.trigIconActive]}>
                    <Icon name="sparkle" size={16} color={active ? colors.accentFg : colors.accentDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickLabel}>{opt.label}</Text>
                    <Text style={styles.pickDesc}>{opt.desc}</Text>
                  </View>
                  {active && <Icon name="check" size={16} color={colors.accentDeep} />}
                </Pressable>
              );
            })}

            <View style={{ marginTop: space.md, marginBottom: space.md }}>
              <Text style={styles.fieldLabel}>Keywords (comma separated)</Text>
              <TextInput
                value={trigKeywords}
                onChangeText={setTrigKeywords}
                placeholder="blank = match any text"
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
              />
            </View>
            <Pressable
              style={styles.doneBtn}
              onPress={() => {
                const postScoped = trigType === 'comment_post' || trigType === 'live_comment';
                mode.onSave({
                  type: trigType,
                  keywords: trigKeywords.trim() ? trigKeywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
                  postIds: postScoped ? trigPostIds : [],
                });
                sheetRef.current?.dismiss();
              }}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </BottomSheetScrollView>
        )}

        {mode?.kind === 'test' && (
          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Test run</Text>
            <View style={{ marginBottom: space.md }}>
              <Text style={styles.fieldLabel}>Simulated message</Text>
              <TextInput
                value={testText}
                onChangeText={setTestText}
                placeholder="Type a message to simulate…"
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
              />
            </View>
            <Pressable
              style={[styles.doneBtn, (!testText.trim() || testRunning) && styles.doneBtnDisabled]}
              disabled={!testText.trim() || testRunning}
              onPress={() => runTest(mode)}
            >
              <Text style={styles.doneBtnText}>{testRunning ? 'Running…' : 'Run test'}</Text>
            </Pressable>

            {testError && <Text style={styles.testErrorText}>{testError}</Text>}

            {testResults && (
              <>
                <View style={[styles.bubbleRow, styles.bubbleRowUser]}>
                  <View style={[styles.bubble, styles.bubbleUser]}>
                    <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{testText}</Text>
                  </View>
                </View>
                {testResults.map((m, i) => (
                  <View key={i} style={styles.bubbleRow}>
                    <View style={[styles.bubble, styles.bubbleMira]}>
                      <Text style={styles.bubbleText}>{m.text}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </BottomSheetScrollView>
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
  trigRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent', marginBottom: 4,
  },
  trigRowActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  trigIconActive: { backgroundColor: colors.accent },

  aiNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: space.md,
  },
  aiNoteText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: colors.accentDeep },
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
  doneBtnDisabled: { opacity: 0.5 },
  doneBtnText: { fontSize: 14.5, fontWeight: '600', color: colors.accentFg },
  testErrorText: { fontSize: 13, color: colors.stBlocked, marginBottom: space.md },

  bubbleRow: { flexDirection: 'row', marginBottom: space.sm },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 },
  bubbleMira: { backgroundColor: colors.accentSoft, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.bgInset, borderBottomRightRadius: 4, alignSelf: 'flex-end' },
  bubbleText: { fontSize: 13.5, color: colors.text, lineHeight: 18 },
  bubbleTextUser: { color: colors.text },
});
