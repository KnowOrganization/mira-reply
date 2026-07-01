import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Card } from '../../src/components/Card';
import { Chip, Toggle, type ChipTone } from '../../src/components/primitives';
import { Icon } from '../../src/components/Icon';
import { colors, radius, space, shadow } from '../../src/theme';
import { SkCard, SkLine, SkChip, SkCircle, SkRepeat } from '../../src/components/skeleton/primitives';
import { useAutomations, usePatchAutomation } from '../../src/api/hooks';
import {
  BuilderSheet,
  type BuilderSheetHandle,
  type FieldDef,
  type TestMessage,
} from '../../src/components/sheets/BuilderSheet';
import type {
  Automation,
  AutomationNode,
  AutomationNodeData,
  AutomationNodeType,
  AutomationTrigger,
  AutomationTriggerType,
} from '@shaiz/shared';

// Native flow BUILDER (doc: Mira.dc.html:1176-1232) — editable name, tap-to-
// configure trigger w/ swap, ordered step list w/ drag-handle reorder +
// insert-before + delete, Test button. All edits flow through the BuilderSheet
// (picker/config/test) and persist via usePatchAutomation, mirroring the doc's
// sheet-driven editor instead of a free node-graph canvas (that stays on web).

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Approximate step-card height (icon row + padding) used to translate vertical
// drag distance into "how many rows did we cross" — a pragmatic stand-in for
// per-row layout measurement; close enough for swap-on-drag at this list size.
const ROW_HEIGHT = 84;

// ── human labels ─────────────────────────────────────────────────────────────
const NODE_LABELS: Record<AutomationNodeType, string> = {
  trigger: 'Trigger',
  post_filter: 'Post filter',
  opening_message: 'Opening DM',
  text_message: 'Send DM',
  card_message: 'Card message',
  image_message: 'Image message',
  comment_reply: 'Public reply',
  ask_follow: 'Ask to follow',
  follow_gate: 'Follow gate',
  lead_form: 'Lead form',
  followup_message: 'Follow-up DM',
  giveaway: 'Giveaway',
  discount_code: 'Discount code',
  quiz: 'Quiz',
  tag_reward: 'Tag reward',
  ab_split: 'A/B split',
  price_reply: 'Price reply',
};

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  comment_post: 'Comment on a post',
  dm: 'Direct message',
  live_comment: 'Live comment',
  story_reply: 'Story reply',
};

const TRIGGER_ORDER: AutomationTriggerType[] = ['comment_post', 'dm', 'live_comment', 'story_reply'];

// Control / gating nodes read as 'grey'; everything else is an action ('accent').
const GREY_NODES: AutomationNodeType[] = ['post_filter', 'ask_follow', 'follow_gate', 'ab_split'];
function nodeTone(type: AutomationNodeType): ChipTone {
  return GREY_NODES.includes(type) ? 'grey' : 'accent';
}

// ── per-node-type config fields ──────────────────────────────────────────────
// Pragmatic field sets per node type — the jsonb `data` bag's exact shape isn't
// fully self-describing from the shared types, so list/object fields (codes,
// answers, variants) are edited as simple delimited text and parsed back.
const NODE_FIELDS: Record<AutomationNodeType, FieldDef[]> = {
  trigger: [],
  post_filter: [
    { key: 'postIds', label: 'Post IDs (comma separated)', type: 'text', placeholder: 'blank = all posts' },
  ],
  opening_message: [
    { key: 'text', label: 'Message', type: 'textarea', placeholder: 'First message when a DM starts' },
  ],
  text_message: [{ key: 'text', label: 'Message', type: 'textarea', placeholder: 'What Mira sends' }],
  card_message: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'text', label: 'Message', type: 'textarea' },
    { key: 'imageUrl', label: 'Image URL', type: 'text' },
  ],
  image_message: [
    { key: 'imageUrl', label: 'Image URL', type: 'text' },
    { key: 'text', label: 'Caption', type: 'textarea' },
  ],
  comment_reply: [
    { key: 'text', label: 'Reply text', type: 'textarea', placeholder: 'Posted as a public comment reply' },
  ],
  ask_follow: [{ key: 'question', label: 'Prompt', type: 'textarea', placeholder: 'Ask the user to follow' }],
  follow_gate: [{ key: 'question', label: 'Gate message', type: 'textarea' }],
  lead_form: [{ key: 'question', label: 'Question', type: 'textarea', placeholder: 'What detail to capture' }],
  followup_message: [
    { key: 'text', label: 'Message', type: 'textarea' },
    { key: 'delayMinutes', label: 'Delay (minutes)', type: 'number' },
  ],
  giveaway: [
    { key: 'text', label: 'Confirmation message', type: 'textarea' },
    { key: 'showEntryNumber', label: 'Show entry number? (yes/no)', type: 'text' },
  ],
  discount_code: [
    { key: 'codePool', label: 'Codes (comma separated)', type: 'textarea' },
    { key: 'outOfCodesText', label: 'Out-of-codes message', type: 'textarea' },
  ],
  quiz: [
    { key: 'text', label: 'Prompt', type: 'textarea' },
    { key: 'answers', label: 'Answers (one per line: match:reply)', type: 'textarea' },
  ],
  tag_reward: [
    { key: 'minTags', label: 'Minimum tags required', type: 'number' },
    { key: 'text', label: 'Reward message', type: 'textarea' },
  ],
  ab_split: [{ key: 'variants', label: 'Variants (one per line: label:text)', type: 'textarea' }],
  price_reply: [{ key: 'text', label: 'Fallback message', type: 'textarea' }],
};

const TRIGGER_FIELDS: FieldDef[] = [
  { key: 'keywords', label: 'Keywords (comma separated)', type: 'text', placeholder: 'blank = match any text' },
  { key: 'postIds', label: 'Post IDs (comma separated)', type: 'text', placeholder: 'blank = all posts' },
];

// ── node data <-> sheet field values ─────────────────────────────────────────
function dataToValues(node: AutomationNode): Record<string, string> {
  const d = node.data ?? {};
  const values: Record<string, string> = {};
  for (const f of NODE_FIELDS[node.type]) {
    switch (f.key) {
      case 'postIds':
        values.postIds = (d.postIds ?? []).join(', ');
        break;
      case 'codePool':
        values.codePool = (d.codePool ?? []).join(', ');
        break;
      case 'answers':
        values.answers = (d.answers ?? []).map((a) => `${a.match}:${a.reply}`).join('\n');
        break;
      case 'variants':
        values.variants = (d.variants ?? []).map((v) => `${v.label}:${v.text}`).join('\n');
        break;
      case 'minTags':
        values.minTags = String(d.minTags ?? 1);
        break;
      case 'delayMinutes':
        values.delayMinutes = d.delayMinutes != null ? String(d.delayMinutes) : '';
        break;
      case 'showEntryNumber':
        values.showEntryNumber = d.showEntryNumber ? 'yes' : 'no';
        break;
      default: {
        const raw = (d as Record<string, unknown>)[f.key];
        values[f.key] = raw != null ? String(raw) : '';
      }
    }
  }
  return values;
}

function valuesToData(type: AutomationNodeType, values: Record<string, string>): AutomationNodeData {
  const data: AutomationNodeData = {};
  for (const f of NODE_FIELDS[type]) {
    const raw = (values[f.key] ?? '').trim();
    switch (f.key) {
      case 'postIds':
        data.postIds = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        break;
      case 'codePool':
        data.codePool = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        break;
      case 'answers':
        data.answers = raw
          ? raw
              .split('\n')
              .map((line) => {
                const [match, ...rest] = line.split(':');
                return { match: (match ?? '').trim(), reply: rest.join(':').trim() };
              })
              .filter((a) => a.match)
          : [];
        break;
      case 'variants':
        data.variants = raw
          ? raw
              .split('\n')
              .map((line) => {
                const [label, ...rest] = line.split(':');
                return { label: (label ?? '').trim(), text: rest.join(':').trim() };
              })
              .filter((v) => v.label)
          : [];
        break;
      case 'minTags':
        data.minTags = raw ? Number(raw) || 1 : 1;
        break;
      case 'delayMinutes':
        data.delayMinutes = raw ? Number(raw) || 0 : undefined;
        break;
      case 'showEntryNumber':
        data.showEntryNumber = raw.toLowerCase() === 'yes' || raw.toLowerCase() === 'true';
        break;
      default:
        (data as Record<string, unknown>)[f.key] = raw;
    }
  }
  return data;
}

function triggerToValues(t: AutomationTrigger): Record<string, string> {
  return { keywords: (t.keywords ?? []).join(', '), postIds: (t.postIds ?? []).join(', ') };
}

function valuesToTrigger(type: AutomationTriggerType, values: Record<string, string>): AutomationTrigger {
  const keywords = (values.keywords ?? '').trim();
  const postIds = (values.postIds ?? '').trim();
  return {
    type,
    keywords: keywords ? keywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
    postIds: postIds ? postIds.split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
}

// ── graph linearization ──────────────────────────────────────────────────────
// Start at the trigger node (or any node with no incoming edge), then walk the
// source→target edges into a single chain. Unreachable nodes get appended.
function linearize(nodes: AutomationNode[], edges: Automation['edges']): AutomationNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const arr = adj.get(e.source) ?? [];
    arr.push(e.target);
    adj.set(e.source, arr);
  }
  const incoming = new Set(edges.map((e) => e.target));
  const start =
    nodes.find((n) => n.type === 'trigger') ??
    nodes.find((n) => !incoming.has(n.id)) ??
    nodes[0];

  const ordered: AutomationNode[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = start?.id;
  while (cur && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    ordered.push(byId.get(cur)!);
    cur = (adj.get(cur) ?? []).find((t) => !seen.has(t));
  }
  for (const n of nodes) if (!seen.has(n.id)) ordered.push(n);
  return ordered;
}

// One-line human summary of a node's config, or null when there's nothing handy.
function nodeSummary(node: AutomationNode): string | null {
  const d = node.data ?? {};
  switch (node.type) {
    case 'opening_message':
    case 'text_message':
    case 'followup_message':
    case 'comment_reply':
      return d.text?.trim() || null;
    case 'card_message':
      return [d.title, d.subtitle].filter(Boolean).join(' — ') || d.text?.trim() || null;
    case 'image_message':
      return d.imageUrl ? 'Sends an image' : d.text?.trim() || null;
    case 'post_filter':
      return d.postIds?.length ? `${d.postIds.length} post(s)` : 'All posts';
    case 'ask_follow':
    case 'follow_gate':
      return d.question?.trim() || 'Requires a follow to continue';
    case 'lead_form':
      return d.question?.trim() || 'Collects a lead detail';
    case 'giveaway':
      return d.showEntryNumber ? 'Confirms entry + entry #' : 'Captures entrants';
    case 'discount_code':
      return d.codePool?.length ? `${d.codePool.length} code(s) in pool` : 'Issues a code';
    case 'quiz':
      return d.answers?.length ? `${d.answers.length} answer(s)` : 'Matches the reply';
    case 'tag_reward':
      return `Needs ${d.minTags ?? 1}+ tagged friend(s)`;
    case 'ab_split':
      return d.variants?.length ? `${d.variants.length} variant(s)` : 'Splits the audience';
    case 'price_reply':
      return 'Looks up a product price';
    default:
      return d.text?.trim() || null;
  }
}

function triggerSummary(t: AutomationTrigger): string {
  const parts: string[] = [];
  if (t.keywords?.length) parts.push(`Keywords: ${t.keywords.join(', ')}`);
  else parts.push('Matches any text');
  if (t.postIds?.length) parts.push(`${t.postIds.length} post(s)`);
  return parts.join('  ·  ');
}

function triggerTestLine(t: AutomationTrigger | null): string {
  if (!t) return 'Hey!';
  if (t.keywords?.length) return t.keywords[0];
  switch (t.type) {
    case 'comment_post':
      return 'Comments on your post';
    case 'dm':
      return 'Sends a DM';
    case 'live_comment':
      return 'Comments during a live';
    case 'story_reply':
      return 'Replies to your story';
    default:
      return 'Hey!';
  }
}

export default function FlowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useAutomations();
  const patch = usePatchAutomation();
  const sheetRef = useRef<BuilderSheetHandle>(null);

  const automation = data?.automations?.find((a) => a.id === id);

  // local optimistic state, synced from the query when it lands/changes
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger | null>(null);
  const [steps, setSteps] = useState<AutomationNode[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const stepsRef = useRef<AutomationNode[]>([]);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    if (!automation) return;
    setEnabled(automation.enabled);
    setName(automation.name);
    setTrigger(automation.trigger);
    setSteps(linearize(automation.nodes, automation.edges).filter((n) => n.type !== 'trigger'));
  }, [automation?.id, automation?.updatedAt]);

  const triggerNode = automation?.nodes.find((n) => n.type === 'trigger');

  function persistSteps(next: AutomationNode[]) {
    if (!id) return;
    const fullNodes = triggerNode ? [triggerNode, ...next] : next;
    patch.mutate({ id, patch: { nodes: fullNodes } });
  }

  function toggleEnabled(v: boolean) {
    if (!id) return;
    setEnabled(v);
    patch.mutate({ id, patch: { enabled: v } });
  }

  function commitName() {
    if (!id || !automation) return;
    const trimmed = name.trim() || 'Untitled flow';
    setName(trimmed);
    if (trimmed === automation.name) return;
    patch.mutate({ id, patch: { name: trimmed } });
  }

  // ── trigger edit / swap ─────────────────────────────────────────────────────
  function openTriggerConfig() {
    if (!automation || !id) return;
    const current = trigger ?? automation.trigger;
    sheetRef.current?.presentConfig('Trigger', TRIGGER_FIELDS, triggerToValues(current), (values) => {
      const nextTrigger = valuesToTrigger(current.type, values);
      setTrigger(nextTrigger);
      patch.mutate({ id, patch: { trigger: nextTrigger } });
    });
  }

  // ponytail: "swap trigger" cycles to the next trigger type on tap rather than
  // opening a dedicated type picker — presentPicker only knows AutomationNodeType,
  // and there are just 4 trigger types, so a cycle button is the simpler, still-
  // discoverable affordance. Tap the card itself to edit keywords/posts.
  function swapTriggerType() {
    if (!automation || !id) return;
    const current = trigger ?? automation.trigger;
    const idx = TRIGGER_ORDER.indexOf(current.type);
    const nextType = TRIGGER_ORDER[(idx + 1) % TRIGGER_ORDER.length];
    const nextTrigger: AutomationTrigger = { ...current, type: nextType };
    setTrigger(nextTrigger);
    patch.mutate({ id, patch: { trigger: nextTrigger } });
  }

  // ── step config / insert / delete ───────────────────────────────────────────
  function openStepConfig(node: AutomationNode) {
    sheetRef.current?.presentConfig(NODE_LABELS[node.type], NODE_FIELDS[node.type], dataToValues(node), (values) => {
      saveNodeConfig(node.id, node.type, values);
    });
  }

  function saveNodeConfig(nodeId: string, type: AutomationNodeType, values: Record<string, string>) {
    const nextData = valuesToData(type, values);
    const next = stepsRef.current.map((s) => (s.id === nodeId ? { ...s, data: nextData } : s));
    setSteps(next);
    persistSteps(next);
  }

  function insertStepAt(index: number) {
    sheetRef.current?.presentPicker((type) => {
      const newNode: AutomationNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        position: { x: 0, y: 0 },
        data: {},
      };
      const next = [...stepsRef.current];
      next.splice(index, 0, newNode);
      setSteps(next);
      persistSteps(next);
      // immediately open config for the freshly inserted node
      sheetRef.current?.presentConfig(NODE_LABELS[type], NODE_FIELDS[type], dataToValues(newNode), (values) => {
        saveNodeConfig(newNode.id, type, values);
      });
    });
  }

  function deleteStep(nodeId: string) {
    const next = stepsRef.current.filter((s) => s.id !== nodeId);
    setSteps(next);
    persistSteps(next);
  }

  // ── drag-handle reorder ──────────────────────────────────────────────────────
  // Simplification (see task notes): rather than free-pixel dragging with manual
  // per-row transforms, vertical drag distance is converted into "rows crossed"
  // against ROW_HEIGHT; crossing a row swaps the dragged step into that slot
  // (recomputed fresh from the gesture's start snapshot on every update, so it
  // never drifts), and LayoutAnimation eases the whole list into its new order.
  const originIndexRef = useRef<number | null>(null);
  const originStepsRef = useRef<AutomationNode[]>([]);
  const currentIndexRef = useRef<number>(0);

  function beginDrag(nodeId: string) {
    const idx = stepsRef.current.findIndex((s) => s.id === nodeId);
    if (idx === -1) return;
    originIndexRef.current = idx;
    currentIndexRef.current = idx;
    originStepsRef.current = stepsRef.current;
    setDraggingId(nodeId);
  }

  function updateDragTarget(translationY: number) {
    if (originIndexRef.current == null) return;
    const origin = originStepsRef.current;
    const max = origin.length - 1;
    const rawTarget = originIndexRef.current + Math.round(translationY / ROW_HEIGHT);
    const target = Math.max(0, Math.min(max, rawTarget));
    if (target === currentIndexRef.current) return;
    currentIndexRef.current = target;
    const next = [...origin];
    const [item] = next.splice(originIndexRef.current, 1);
    next.splice(target, 0, item);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSteps(next);
  }

  function endDrag() {
    if (originIndexRef.current == null) return;
    originIndexRef.current = null;
    setDraggingId(null);
    persistSteps(stepsRef.current);
  }

  function buildStepPan(nodeId: string) {
    return Gesture.Pan()
      .activeOffsetY([-6, 6])
      .onBegin(() => {
        runOnJS(beginDrag)(nodeId);
      })
      .onUpdate((e) => {
        runOnJS(updateDragTarget)(e.translationY);
      })
      .onEnd(() => {
        runOnJS(endDrag)();
      });
  }

  // ── test ─────────────────────────────────────────────────────────────────────
  function openTest() {
    if (!automation) return;
    const current = trigger ?? automation.trigger;
    const messages: TestMessage[] = [{ from: 'user', text: triggerTestLine(current) }];
    if (steps.length === 0) {
      messages.push({ from: 'mira', text: 'No steps configured yet — add one below.' });
    } else {
      for (const step of steps.slice(0, 3)) {
        messages.push({ from: 'mira', text: nodeSummary(step) ?? NODE_LABELS[step.type] });
      }
    }
    sheetRef.current?.presentTest(messages);
  }

  const headerRight = automation ? (
    <View style={styles.headerRightRow}>
      <Pressable onPress={openTest} hitSlop={6} style={({ pressed }) => [styles.testBtn, pressed && styles.pressed]}>
        <Text style={styles.testGlyph}>▶</Text>
        <Text style={styles.testBtnText}>Test</Text>
      </Pressable>
      <Toggle value={enabled} onValueChange={toggleEnabled} />
    </View>
  ) : undefined;

  const effectiveTrigger = trigger ?? automation?.trigger ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title={automation?.name ?? 'Flow'} right={headerRight} />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !automation ? (
          <>
            {/* Flow name skeleton */}
            <Text style={styles.sectionLabel}>Flow name</Text>
            <SkLine w="80%" h={20} style={{ marginBottom: space.xl }} />

            {/* Trigger card skeleton */}
            <Text style={styles.sectionLabel}>When this happens</Text>
            <SkCard radius={radius.lg} style={styles.card} p={space.lg}>
              <View style={styles.triggerRow}>
                <SkCircle size={40} />
                <View style={styles.triggerBody}>
                  <View style={styles.chipRow}>
                    <SkChip w={92} />
                  </View>
                  <SkLine w="65%" h={12} style={{ marginTop: 8 }} />
                </View>
              </View>
            </SkCard>

            {/* Step card skeletons */}
            <Text style={[styles.sectionLabel, { marginTop: space.xl }]}>Then do this</Text>
            <SkRepeat n={3}>
              {(i) => (
                <SkCard key={i} radius={16} style={styles.card} p={14}>
                  <View style={styles.stepInner}>
                    <SkCircle size={28} />
                    <View style={styles.stepBody}>
                      <View style={styles.chipRow}>
                        <SkChip w={84} />
                      </View>
                      <SkLine w="80%" h={12} style={{ marginTop: 8 }} />
                    </View>
                  </View>
                </SkCard>
              )}
            </SkRepeat>

            {/* Stats footer skeleton */}
            <Text style={[styles.sectionLabel, { marginTop: space.xl }]}>Performance</Text>
            <SkCard radius={radius.lg} style={styles.card}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <SkLine w={32} h={22} />
                  <SkLine w={56} h={11} style={{ marginTop: 4 }} />
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <SkLine w={32} h={22} />
                  <SkLine w={64} h={11} style={{ marginTop: 4 }} />
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <SkLine w={32} h={22} />
                  <SkLine w={48} h={11} style={{ marginTop: 4 }} />
                </View>
              </View>
            </SkCard>
          </>
        ) : !automation ? (
          <Card radius={radius.lg} style={styles.notFound}>
            <View style={styles.notFoundInner}>
              <View style={styles.emptyIcon}>
                <Icon name="flows" size={22} color={colors.accentDeep} />
              </View>
              <Text style={styles.notFoundTitle}>Flow not found</Text>
              <Text style={styles.notFoundText}>
                This automation may have been removed. Use the back arrow to return.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {/* Flow name */}
            <Text style={styles.sectionLabel}>Flow name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={commitName}
              placeholder="Untitled flow"
              placeholderTextColor={colors.textSubtle}
              style={styles.nameInput}
            />

            {/* Trigger card */}
            <Text style={[styles.sectionLabel, { color: colors.stWarm }]}>When this happens</Text>
            {effectiveTrigger && (
              <Pressable onPress={openTriggerConfig} style={({ pressed }) => pressed && styles.pressed}>
                <Card glow radius={radius.lg} style={styles.card}>
                  <View style={styles.cardInner}>
                    <View style={styles.triggerRow}>
                      <View style={styles.triggerIcon}>
                        <Icon name="sparkle" size={18} color={colors.accentDeep} />
                      </View>
                      <View style={styles.triggerBody}>
                        <View style={styles.chipRow}>
                          <Chip label={TRIGGER_LABELS[effectiveTrigger.type]} tone="warm" />
                        </View>
                        <Text style={styles.cardSummary}>{triggerSummary(effectiveTrigger)}</Text>
                      </View>
                      <Pressable onPress={swapTriggerType} hitSlop={8} style={styles.swapBtn}>
                        <Text style={styles.swapGlyph}>⇄</Text>
                      </Pressable>
                    </View>
                  </View>
                </Card>
              </Pressable>
            )}

            {/* Steps */}
            <Text style={[styles.sectionLabel, { color: colors.accentDeep, marginTop: space.xl }]}>
              Then do this {steps.length > 0 ? `· ${steps.length}` : ''}
            </Text>

            {steps.length === 0 && (
              <Text style={[styles.notFoundText, { marginBottom: space.md, textAlign: 'left' }]}>
                No steps yet — tap "Add step" below to start building.
              </Text>
            )}

            {steps.map((node, i) => {
              const summary = nodeSummary(node);
              const pan = buildStepPan(node.id);
              return (
                <View key={node.id}>
                  <Pressable onPress={() => insertStepAt(i)} hitSlop={10} style={styles.insertRow}>
                    <View style={styles.insertBtn}>
                      <Icon name="plus" size={13} color={colors.textSubtle} />
                    </View>
                  </Pressable>
                  <Card radius={16} style={[styles.card, draggingId === node.id && styles.cardDragging]}>
                    <View style={styles.stepInner}>
                      <Pressable onPress={() => openStepConfig(node)} style={styles.stepTapArea}>
                        <View style={styles.indexBadge}>
                          <Text style={styles.indexBadgeText}>{i + 1}</Text>
                        </View>
                        <View style={styles.stepBody}>
                          <View style={styles.chipRow}>
                            <Chip label={NODE_LABELS[node.type]} tone={nodeTone(node.type)} />
                          </View>
                          {summary && (
                            <Text style={styles.cardSummary} numberOfLines={2}>
                              {summary}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                      <Pressable onPress={() => deleteStep(node.id)} hitSlop={8} style={styles.deleteBtn}>
                        <Icon name="close" size={15} color={colors.textSubtle} />
                      </Pressable>
                      <GestureDetector gesture={pan}>
                        <View style={styles.gripHandle}>
                          <Text style={styles.gripGlyph}>⠿</Text>
                        </View>
                      </GestureDetector>
                    </View>
                  </Card>
                </View>
              );
            })}

            <Pressable
              onPress={() => insertStepAt(steps.length)}
              style={({ pressed }) => [styles.addStepBtn, pressed && styles.pressed]}
            >
              <Icon name="plus" size={16} color={colors.accent} />
              <Text style={styles.addStepText}>Add step</Text>
            </Pressable>
            <View style={styles.endOfFlow}>
              <View style={styles.endDot} />
              <Text style={styles.endText}>End of flow</Text>
            </View>

            {/* Stats footer */}
            <Text style={[styles.sectionLabel, { marginTop: space.xl }]}>Performance</Text>
            <Card radius={radius.lg} style={styles.card}>
              <View style={styles.statsRow}>
                <Stat label="Triggered" value={automation.stats.triggered} />
                <View style={styles.statDivider} />
                <Stat label="Completed" value={automation.stats.completed} tone={colors.stDone} />
                <View style={styles.statDivider} />
                <Stat label="Failed" value={automation.stats.failed} tone={colors.stBlocked} />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
      <BuilderSheet ref={sheetRef} />
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  loading: { paddingVertical: space.xxl, alignItems: 'center' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: space.sm,
  },

  card: { marginBottom: space.md },
  cardDragging: { ...shadow.pop, opacity: 0.94, transform: [{ scale: 1.01 }] },
  cardInner: { padding: space.lg },
  cardSummary: { fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },

  // flow name
  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: space.xl,
  },

  // trigger
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  triggerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerBody: { flex: 1 },
  swapBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapGlyph: { fontSize: 14, color: colors.textSubtle },

  // insert-before
  insertRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  insertBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // step card
  stepInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 14 },
  stepTapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minWidth: 0 },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  indexBadgeText: { fontSize: 13, fontWeight: '600', color: colors.accentFg },
  stepBody: { flex: 1 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gripHandle: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  gripGlyph: { fontSize: 18, color: colors.borderStrong, fontWeight: '700' },

  // add step / end of flow
  addStepBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.xs,
  },
  addStepText: { fontSize: 13.5, fontWeight: '500', color: colors.accent },
  endOfFlow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginTop: space.md },
  endDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 2, borderColor: colors.borderStrong },
  endText: { fontSize: 11, color: colors.textSubtle },

  // header right (test + toggle)
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  testBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  testGlyph: { fontSize: 10, color: colors.text },
  testBtnText: { fontSize: 12.5, fontWeight: '500', color: colors.text },

  // stats
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '600', color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border },

  // not found
  notFound: { marginTop: space.lg },
  notFoundInner: { padding: space.xl, alignItems: 'center', gap: space.sm },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  notFoundTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  notFoundText: { fontSize: 13.5, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
});
