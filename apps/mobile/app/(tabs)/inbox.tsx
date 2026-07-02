import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FlatList, View, Text, StyleSheet, Pressable, Animated, RefreshControl,
  LayoutAnimation, Platform, UIManager, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SwipeableDraftCard } from '../../src/components/SwipeableDraftCard';
import { Icon } from '../../src/components/Icon';
import { SegmentedControl } from '../../src/components/primitives';
import { colors, space, shadow } from '../../src/theme';
import { SkRepeat } from '../../src/components/skeleton/primitives';
import { SkDraftCard } from '../../src/components/skeleton/units';
import { DraftCard } from '../../src/components/inbox/DraftCard';
import { StandupHeader, type DmMode } from '../../src/components/inbox/StandupHeader';
import { HandledRow } from '../../src/components/inbox/HandledRow';
import { needsYou, sortNeedsYou } from '../../src/components/inbox/rank';
import { UndoToast, usePendingAction } from '../../src/components/UndoToast';
import { windowClosed } from '../../src/components/WindowChip';
import { EditDraftSheet, type EditDraftSheetHandle } from '../../src/components/sheets/EditDraftSheet';
import { DecisionTraceSheet, type DecisionTraceSheetHandle } from '../../src/components/sheets/DecisionTraceSheet';
import { ConversationSheet, type ConversationSheetHandle } from '../../src/components/sheets/ConversationSheet';
import { AutonomySheet, type AutonomySheetHandle } from '../../src/components/sheets/AutonomySheet';
import { BatchApproveSheet, type BatchApproveSheetHandle } from '../../src/components/sheets/BatchApproveSheet';
import { haptics } from '../../src/lib/haptics';
import {
  useConversations,
  useInboxStream,
  useSendReply,
  useDismissDraft,
  useGenerateDraft,
  useSyncDms,
  useOpportunities,
  useFlaggedModeration,
  useStatus,
  type CrmConversationListItem,
} from '../../src/api/hooks';

// The inbox is Mira reporting to her boss: a standup of what she did, a queue
// of decisions she needs (ranked by closing windows and money), and a receipt
// ledger of what she handled. SSE is the instant path; 5s poll is the backstop.

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// once-per-session guard for the first-open DM import
let didAutoSync = false;

export default function Inbox() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connected } = useInboxStream();
  const { data, isLoading } = useConversations();
  const conversations = data?.conversations ?? [];

  const sendReply = useSendReply();
  const dismissDraft = useDismissDraft();
  const generateDraft = useGenerateDraft();
  const syncDms = useSyncDms();
  const oppsQ = useOpportunities('new');
  const flaggedQ = useFlaggedModeration();
  const { data: status } = useStatus<{ dmMode?: string }>();

  const editSheet = useRef<EditDraftSheetHandle>(null);
  const traceSheet = useRef<DecisionTraceSheetHandle>(null);
  const convSheet = useRef<ConversationSheetHandle>(null);
  const autonomySheet = useRef<AutonomySheetHandle>(null);
  const batchSheet = useRef<BatchApproveSheetHandle>(null);

  const [segment, setSegment] = useState(0); // 0 = Needs you, 1 = Handled
  const { pending, start, undo, pendingId } = usePendingAction();

  // first-open import — never show Inbox Zero before at least one sync ran
  useEffect(() => {
    if (didAutoSync || isLoading) return;
    if (conversations.length === 0) {
      didAutoSync = true;
      syncDms.mutate(25);
    } else {
      didAutoSync = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, conversations.length]);
  const importing = syncDms.isPending;

  // live badge pulse
  const liveDotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!connected) { liveDotOpacity.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotOpacity, { toValue: 0.35, duration: 950, useNativeDriver: true }),
        Animated.timing(liveDotOpacity, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [connected, liveDotOpacity]);

  // strata
  const visible = conversations.filter((c) => c.id !== pendingId);
  const needs = useMemo(() => sortNeedsYou(visible.filter(needsYou)), [visible]);
  const handled = useMemo(
    () => visible.filter((c) => !needsYou(c)).sort((a, b) => b.updated_at - a.updated_at),
    [visible],
  );

  // standup numbers
  const valueInPlay = (oppsQ.data?.opportunities ?? []).reduce((s, o) => s + (o.value_estimate ?? 0), 0);
  const standup = {
    handled: handled.length,
    drafted: visible.filter((c) => !!c.ai_draft).length,
    asked: visible.filter((c) => !!c.pending_slot).length,
    flagged: flaggedQ.data?.flagged?.length ?? 0,
    valueInPlay,
  };

  // batch eligibility: high confidence, low risk, window open
  const batchable = needs.filter(
    (c) => !!c.ai_draft && (c.ai_confidence ?? 0) >= 0.8 && (c.ai_risk === 'low' || c.ai_risk == null) && !windowClosed(c),
  );

  function commitSend(c: CrmConversationListItem) {
    if (!c.ai_draft || windowClosed(c)) return;
    const text = c.ai_draft;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    start({
      id: c.id,
      label: `Sent to ${c.display_name?.trim() || `@${c.igsid}`}`,
      commit: () => {
        sendReply.mutate({ id: c.id, text });
        haptics.success();
      },
    });
  }

  function commitSkip(c: CrmConversationListItem) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    start({
      id: c.id,
      label: `Skipped ${c.display_name?.trim() || `@${c.igsid}`}'s draft`,
      commit: () => dismissDraft.mutate(c.id),
    });
  }

  function openEdit(c: CrmConversationListItem, prefill?: string) {
    editSheet.current?.present(prefill ?? c.ai_draft ?? '', async (text) => {
      await sendReply.mutateAsync({ id: c.id, text });
      haptics.success();
    });
  }

  function openBatch() {
    batchSheet.current?.present(batchable, async (id, text) => {
      await sendReply.mutateAsync({ id, text });
    });
  }

  const listData = segment === 0 ? needs : handled;

  const header = (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Inbox</Text>
        <View style={[styles.liveWrap, !connected && styles.liveWrapOff]}>
          <Animated.View
            style={[
              styles.liveDot,
              { backgroundColor: connected ? colors.stDone : colors.textSubtle, opacity: connected ? liveDotOpacity : 1 },
            ]}
          />
          <Text style={[styles.liveLabel, { color: connected ? colors.stDone : colors.textSubtle }]}>
            {connected ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      <StandupHeader
        n={standup}
        dmMode={(status?.dmMode as DmMode) ?? null}
        onModeTap={() => { haptics.open(); autonomySheet.current?.present(); }}
      />

      <View style={styles.segmentWrap}>
        <SegmentedControl
          segments={[`Needs you${needs.length ? ` (${needs.length})` : ''}`, 'Handled']}
          index={segment}
          onChange={(i) => { haptics.select(); setSegment(i); }}
        />
      </View>

      {segment === 0 && batchable.length >= 2 && (
        <Pressable onPress={openBatch} style={({ pressed }) => [styles.batchPill, pressed && styles.pressed]}>
          <Icon name="sparkle" size={14} color={colors.accentFg} />
          <Text style={styles.batchText}>Approve {batchable.length} low-risk drafts</Text>
          <Icon name="chevronRight" size={14} color={colors.accentFg} />
        </Pressable>
      )}
    </View>
  );

  const empty = importing ? (
    <View>
      <View style={styles.importing}>
        <Text style={styles.importingText}>Mira is reading your DMs…</Text>
      </View>
      <SkRepeat n={3}>{(i) => <SkDraftCard key={i} />}</SkRepeat>
    </View>
  ) : isLoading ? (
    <SkRepeat n={3}>{(i) => <SkDraftCard key={i} />}</SkRepeat>
  ) : (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>✨</Text>
      <Text style={styles.emptyTitle}>{segment === 0 ? 'Nothing needs you' : 'No history yet'}</Text>
      <Text style={styles.emptyText}>
        {segment === 0
          ? "Mira's on top of everything. New drafts and questions will land here."
          : 'Conversations Mira has handled will show up here as receipts.'}
      </Text>
      <Pressable
        onPress={() => syncDms.mutate(25)}
        style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}
      >
        <Text style={styles.emptyBtnLabel}>Sync recent DMs</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <FlatList
        data={listData}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: insets.top + space.lg, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl refreshing={syncDms.isPending} onRefresh={() => syncDms.mutate(10)} tintColor={colors.textSubtle} />
        }
        renderItem={({ item: c }) =>
          segment === 1 ? (
            <HandledRow c={c} onPress={() => router.push(`/thread/${c.id}`)} />
          ) : (
            <SwipeableDraftCard
              radius={18}
              style={styles.cardWrap}
              canSend={!!c.ai_draft && !windowClosed(c)}
              disabled={false}
              onSend={() => commitSend(c)}
              onSkip={() => (c.ai_draft ? commitSkip(c) : undefined)}
            >
              <DraftCard
                c={c}
                sending={false}
                skipping={false}
                generating={generateDraft.isPending && generateDraft.variables === c.id}
                onOpenThread={() => router.push(`/thread/${c.id}`)}
                onSend={() => commitSend(c)}
                onSkip={() => commitSkip(c)}
                onEditDraft={() => openEdit(c)}
                onTrace={() => { haptics.open(); traceSheet.current?.present(c); }}
                onCandidate={(label) => openEdit(c, label)}
                onLongPress={() => { haptics.open(); convSheet.current?.present(c); }}
                onGenerate={() =>
                  generateDraft.mutate(c.id, {
                    onError: (e) =>
                      Alert.alert('Mira could not draft', e instanceof Error ? e.message : 'Try again.'),
                  })
                }
              />
            </SwipeableDraftCard>
          )
        }
      />

      {pending && <UndoToast label={pending.label} onUndo={undo} />}

      <EditDraftSheet ref={editSheet} />
      <DecisionTraceSheet ref={traceSheet} />
      <ConversationSheet ref={convSheet} />
      <AutonomySheet ref={autonomySheet} />
      <BatchApproveSheet ref={batchSheet} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.7 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenTitle: { fontSize: 26, fontWeight: '600', color: colors.text, letterSpacing: -0.8 },
  liveWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(31,157,107,0.12)', borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  liveWrapOff: { backgroundColor: colors.bgInset },
  liveDot: { width: 7, height: 7, borderRadius: 999 },
  liveLabel: { fontSize: 11, fontWeight: '500' },

  segmentWrap: { marginTop: space.lg, marginBottom: space.md },

  batchPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 42, borderRadius: 13, backgroundColor: colors.accent,
    marginBottom: space.md, ...shadow.card,
  },
  batchText: { fontSize: 13.5, fontWeight: '600', color: colors.accentFg },

  importing: { alignItems: 'center', paddingVertical: 14 },
  importingText: { fontSize: 13, color: colors.textMuted },

  empty: { marginTop: space.xl, paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center' },
  emptyEmoji: { fontSize: 46 },
  emptyTitle: { fontSize: 18, fontWeight: '500', color: colors.text, marginTop: 10, letterSpacing: -0.4 },
  emptyText: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  emptyBtn: {
    marginTop: 18, height: 40, paddingHorizontal: 18, borderRadius: 11,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElev,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyBtnLabel: { fontSize: 13, fontWeight: '500', color: colors.text },

  cardWrap: { marginBottom: 11 },
});
