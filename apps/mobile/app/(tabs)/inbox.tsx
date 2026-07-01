import { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../src/components/Card';
import { SwipeableDraftCard } from '../../src/components/SwipeableDraftCard';
import { Chip, type ChipTone } from '../../src/components/primitives';
import { Icon } from '../../src/components/Icon';
import { colors, space, shadow } from '../../src/theme';
import { SkRepeat } from '../../src/components/skeleton/primitives';
import { SkDraftCard } from '../../src/components/skeleton/units';
import {
  useConversations,
  useInboxStream,
  useSendReply,
  usePatchConversation,
  type CrmConversationListItem,
} from '../../src/api/hooks';

// Inbox: a drafts-approval queue. useInboxStream() is the instant SSE path
// (drives the live badge); useConversations() is the data + 5s poll backstop.
const FOLDERS = ['all', 'primary', 'general', 'requests'] as const;
type Folder = (typeof FOLDERS)[number];

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function displayName(c: CrmConversationListItem): string {
  return c.display_name?.trim() || (c.igsid ? `@${c.igsid}` : 'Conversation');
}

function avatarLetter(c: CrmConversationListItem): string {
  const src = c.display_name?.trim() || c.igsid || '?';
  return src.charAt(0).toUpperCase();
}

// hot leads read warm, everything else stays neutral grey
function leadTone(status: string): ChipTone {
  return status === 'qualified' || status === 'hot' || status === 'opportunity' ? 'warm' : 'grey';
}

export default function Inbox() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [folder, setFolder] = useState<Folder>('all');
  const { connected } = useInboxStream();
  const { data, isLoading } = useConversations(folder === 'all' ? undefined : folder);
  const conversations = data?.conversations ?? [];

  const sendReply = useSendReply();
  const patchConversation = usePatchConversation();

  // Live badge dot: glow 1.9s ease-in-out infinite (Mira.dc.html:269)
  const liveDotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!connected) {
      liveDotOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotOpacity, { toValue: 0.35, duration: 950, useNativeDriver: true }),
        Animated.timing(liveDotOpacity, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [connected, liveDotOpacity]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: insets.top + space.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.folderRow}
          style={styles.folderScroll}
        >
          {FOLDERS.map((f) => {
            const active = f === folder;
            return (
              <Pressable
                key={f}
                onPress={() => setFolder(f)}
                style={({ pressed }) => [
                  styles.folderChip,
                  active && styles.folderChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.folderLabel, active && styles.folderLabelActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.list}>
            <SkRepeat n={3}>{(i) => <SkDraftCard key={i} />}</SkRepeat>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Inbox zero</Text>
            <Text style={styles.emptyText}>Mira's handling everything. New drafts will appear here for your approval.</Text>
            <Pressable
              onPress={() => { /* TODO: wire demo draft replay */ }}
              style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}
            >
              <Text style={styles.emptyBtnLabel}>Replay demo drafts</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {conversations.map((c) => {
              const showLead = !!c.lead_status && c.lead_status !== 'none';
              const sending = sendReply.isPending && sendReply.variables?.id === c.id;
              const skipping = patchConversation.isPending && patchConversation.variables?.id === c.id;
              const canSend = !!c.ai_draft && !sending && !skipping;

              const onSend = () => {
                if (!c.ai_draft || sending) return;
                sendReply.mutate({ id: c.id, text: c.ai_draft });
              };
              const onSkip = () => {
                if (skipping) return;
                // dismiss the parked draft so the queue clears
                patchConversation.mutate({ id: c.id, patch: { ai_draft: null } });
              };

              return (
                <SwipeableDraftCard
                  key={c.id}
                  radius={18}
                  style={styles.cardWrap}
                  canSend={canSend}
                  disabled={sending || skipping}
                  onSend={onSend}
                  onSkip={onSkip}
                >
                <Card radius={18} style={styles.card}>
                  {/* identity row — avatar/name area opens the thread detail; swipe/Send/Skip untouched */}
                  <View style={styles.topRow}>
                    <Pressable
                      onPress={() => router.push(`/thread/${c.id}`)}
                      style={({ pressed }) => [styles.identityPress, pressed && styles.pressed]}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{avatarLetter(c)}</Text>
                      </View>
                      <View style={styles.identity}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name} numberOfLines={1}>{displayName(c)}</Text>
                          <Text style={styles.time}>{formatRelative(c.updated_at)}</Text>
                        </View>
                        {c.igsid ? (
                          <Text style={styles.handle} numberOfLines={1}>@{c.igsid}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                    {showLead ? <Chip label={c.lead_status} tone={leadTone(c.lead_status)} small /> : null}
                  </View>

                  {/* last incoming message */}
                  {c.last_text ? (
                    <View style={styles.well}>
                      <Text style={styles.wellText} numberOfLines={3}>{c.last_text}</Text>
                    </View>
                  ) : null}

                  {/* AI draft awaiting approval */}
                  {c.ai_draft ? (
                    <View style={styles.draftRow}>
                      <View style={styles.draftTile}>
                        <Icon name="sparkle" size={12} color={colors.accentDeep} />
                      </View>
                      <View style={styles.draftBubble}>
                        <Text style={styles.draftText}>{c.ai_draft}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* footer: window label + actions */}
                  <View style={styles.footer}>
                    <View style={styles.windowWrap}>
                      <Icon name="clock" size={11} color={colors.textSubtle} />
                      <Text style={styles.windowLabel}>Updated {formatRelative(c.updated_at)} ago</Text>
                    </View>
                    <View style={styles.actions}>
                      <Pressable
                        onPress={onSkip}
                        disabled={skipping}
                        style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
                      >
                        <Icon name="close" size={16} color={colors.textSubtle} />
                      </Pressable>
                      <Pressable
                        onPress={onSend}
                        disabled={!canSend}
                        style={({ pressed }) => [styles.sendBtn, !canSend && styles.sendBtnOff, pressed && styles.pressed]}
                      >
                        {sending ? (
                          <ActivityIndicator color={colors.accentFg} size="small" />
                        ) : (
                          <>
                            <Icon name="check" size={14} color={colors.accentFg} />
                            <Text style={styles.sendLabel}>Send</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </Card>
                </SwipeableDraftCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.7 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  liveWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(31,157,107,0.12)', borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  liveWrapOff: { backgroundColor: colors.bgInset },
  liveDot: { width: 7, height: 7, borderRadius: 999 },
  liveLabel: { fontSize: 11, fontWeight: '500' },

  folderScroll: { marginTop: space.lg, marginHorizontal: -space.xl },
  folderRow: { gap: space.sm, paddingHorizontal: space.xl },
  folderChip: {
    paddingHorizontal: 14, height: 32, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.border,
  },
  folderChipActive: { backgroundColor: '#18181b', borderColor: '#18181b' },
  folderLabel: { fontSize: 13, fontWeight: '500', color: colors.textMuted, textTransform: 'capitalize' },
  folderLabelActive: { color: '#fff' },

  loading: { marginTop: space.xxl },

  empty: { marginTop: space.xl, paddingVertical: 70, paddingHorizontal: 20, alignItems: 'center' },
  emptyEmoji: { fontSize: 46 },
  emptyTitle: { fontSize: 18, fontWeight: '500', color: colors.text, marginTop: 10, letterSpacing: -0.4 },
  emptyText: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  emptyBtn: {
    marginTop: 18, height: 40, paddingHorizontal: 18, borderRadius: 11,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElev,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyBtnLabel: { fontSize: 13, fontWeight: '500', color: colors.text },

  list: { marginTop: space.xl },
  cardWrap: { marginBottom: 11 },
  card: { padding: 14 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: '#3f3f46',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  identity: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  time: { fontSize: 11, color: '#9c9ca1' },
  handle: { fontSize: 11.5, color: '#9c9ca1' },

  well: {
    marginTop: 11, backgroundColor: colors.bgInset, borderRadius: 11,
    paddingVertical: 9, paddingHorizontal: 11,
  },
  wellText: { fontSize: 13, color: '#6b6b70', lineHeight: 18 },

  draftRow: { marginTop: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  draftTile: {
    width: 20, height: 20, borderRadius: 6, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  draftBubble: {
    flex: 1, backgroundColor: colors.accentSoft,
    borderWidth: 1, borderColor: 'rgba(90,95,224,0.22)',
    borderRadius: 11, borderTopLeftRadius: 3,
    paddingVertical: 9, paddingHorizontal: 11,
  },
  draftText: { fontSize: 13, color: '#18181b', lineHeight: 18 },

  footer: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  windowWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  windowLabel: { fontSize: 10.5, color: '#9c9ca1' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skipBtn: {
    width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: '#ebebed',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  sendBtn: {
    height: 32, paddingHorizontal: 14, borderRadius: 9, backgroundColor: '#18181b',
    flexDirection: 'row', alignItems: 'center', gap: 6, ...shadow.card,
  },
  sendBtnOff: { opacity: 0.4 },
  sendLabel: { fontSize: 12.5, fontWeight: '500', color: '#fff' },
});
