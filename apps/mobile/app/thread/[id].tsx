import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets as useInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Glass } from '../../src/components/Glass';
import { Icon } from '../../src/components/Icon';
import { LetterAvatar } from '../../src/components/LetterAvatar';
import { WindowChip, windowClosed } from '../../src/components/WindowChip';
import { colors, radius, space, shadow } from '../../src/theme';
import { haptics } from '../../src/lib/haptics';
import { useConversation, useSendReply, useDismissDraft, useGenerateDraft, useUploadImage, type CrmMessage } from '../../src/api/hooks';

// DM thread detail (Mira.dc.html:1143-1173): chat transcript with "Mira
// drafted" tags on AI-sent messages, a "Mira suggests" quick-send pill above
// the composer (driven by conversation.ai_draft, the parked unsent draft —
// not yet-sent ai messages, which already render inline in the transcript),
// and a fixed composer bar. Pushed from Inbox by tapping a card's identity row.

function displayName(name: string | null | undefined, igsid: string): string {
  return name?.trim() || (igsid ? `@${igsid}` : 'Conversation');
}

// igsid is Meta's numeric app-scoped id — never worth showing as a "handle".
// Only render @handles that look like actual usernames.
function realHandle(igsid: string | null | undefined): string | null {
  if (!igsid || /^\d+$/.test(igsid)) return null;
  return igsid;
}

function formatDay(ts: number | string): string {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return '';
  const d = new Date(n);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function sameDay(a: number | string, b: number | string): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return true;
  return new Date(na).toDateString() === new Date(nb).toDateString();
}

function formatTime(ts: number | string | null | undefined): string {
  // created_at can arrive as a numeric string from Postgres — coerce, and
  // never render "12:NaN AM"
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return '';
  const d = new Date(n);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0' : ''}${m} ${ampm}`;
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useConversation(id ?? null);
  const sendReply = useSendReply();
  const dismissDraft = useDismissDraft();
  const generateDraft = useGenerateDraft();
  const uploadImage = useUploadImage();
  const [attaching, setAttaching] = useState(false);
  const [composer, setComposer] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  // draft edit-in-place — tap the suggest text to finish Mira's sentence
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const listRef = useRef<FlatList<CrmMessage>>(null);

  const conversation = data?.conversation;
  const messages = data?.messages ?? [];
  const closed = conversation ? windowClosed(conversation) : false;
  const reversed = [...messages].reverse();
  const latestOutId = reversed.find((m) => m.direction === 'out')?.id;

  useEffect(() => {
    // new messages land at the bottom (list is reversed — see below)
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [messages.length]);

  const onSend = (text: string, clearDraftEdit = false) => {
    const trimmed = text.trim();
    if (!trimmed || !id || sendReply.isPending || closed) return;
    setSendError(null);
    sendReply.mutate(
      { id, text: trimmed },
      {
        onSuccess: () => {
          setComposer('');
          if (clearDraftEdit) setEditingDraft(null);
          haptics.success();
        },
        onError: (e) => {
          // surface the 409 (window closed) instead of failing silently
          setSendError(e instanceof Error ? e.message : 'Send failed');
          haptics.error();
        },
      }
    );
  };

  // pick → relay upload → send as an IG image attachment
  async function pickAndSendImage() {
    if (!id || attaching || closed) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setAttaching(true);
    setSendError(null);
    try {
      const mime = asset.mimeType ?? 'image/jpeg';
      const { url } = await uploadImage.mutateAsync(`data:${mime};base64,${asset.base64}`);
      await sendReply.mutateAsync({ id, imageUrl: url });
      haptics.success();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Image send failed');
      haptics.error();
    }
    setAttaching(false);
  }

  const title = conversation ? displayName(conversation.display_name, conversation.igsid) : 'Thread';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.root}>
        <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
        <ThreadHeader
          conversation={conversation ?? null}
          title={title}
        />

        {closed && (
          <View style={styles.closedBanner}>
            <Icon name="clock" size={12} color={colors.stBlocked} />
            <Text style={styles.closedBannerText}>
              Reply window closed — Instagram blocks outbound until they message again.
            </Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={reversed}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No messages yet</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            // inverted list — the footer renders at the visual TOP: the
            // contact intro block (Telegram-style thread opening)
            conversation ? (
              <View style={styles.intro}>
                <LetterAvatar id={conversation.igsid || conversation.id} name={conversation.display_name} size={64} />
                <Text style={styles.introName}>{title}</Text>
                {realHandle(conversation.igsid) ? (
                  <Text style={styles.introHandle}>@{realHandle(conversation.igsid)}</Text>
                ) : null}
                {conversation.display_name ? (
                  <Pressable
                    onPress={() => Linking.openURL(`https://instagram.com/${conversation.display_name}`)}
                    style={({ pressed }) => [styles.introBtn, pressed && styles.pressed]}
                  >
                    <Icon name="instagram" size={14} color={colors.text} />
                    <Text style={styles.introBtnText}>View on Instagram</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            // inverted list: index 0 is the newest (visual bottom). Group
            // consecutive same-direction messages IG-style: tight spacing
            // inside a group, tail corner only on the newest of the group,
            // avatar beside the incoming tail, day separators between days.
            const older = reversed[index + 1];
            const newer = reversed[index - 1];
            const firstInGroup = !older || older.direction !== item.direction;
            const lastInGroup = !newer || newer.direction !== item.direction;
            const firstOfDay = !older || !sameDay(older.created_at, item.created_at);
            return (
              <>
                {firstOfDay && (
                  <View style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{formatDay(item.created_at)}</Text>
                  </View>
                )}
                <MessageBubble
                  message={item}
                  firstInGroup={firstInGroup}
                  lastInGroup={lastInGroup}
                  latestOut={item.direction === 'out' && item.id === latestOutId}
                  contact={conversation ? { id: conversation.igsid || conversation.id, name: conversation.display_name } : null}
                />
              </>
            );
          }}
        />

        {conversation?.ai_draft ? (
          <View style={styles.suggestPill}>
            <View style={styles.suggestIcon}>
              <Icon name="sparkle" size={12} color={colors.accentFg} />
            </View>
            {editingDraft != null ? (
              <TextInput
                value={editingDraft}
                onChangeText={setEditingDraft}
                multiline
                autoFocus
                style={styles.suggestEdit}
              />
            ) : (
              <Pressable style={styles.suggestBody} onPress={() => setEditingDraft(conversation.ai_draft!)}>
                <Text style={styles.suggestLabel}>Mira suggests · tap to edit</Text>
                <Text style={styles.suggestText} numberOfLines={2}>{conversation.ai_draft}</Text>
              </Pressable>
            )}
            <View style={styles.suggestActions}>
              <Pressable
                onPress={() => { dismissDraft.mutate(conversation.id); setEditingDraft(null); }}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Icon name="close" size={14} color={colors.textSubtle} />
              </Pressable>
              <Pressable
                onPress={() => onSend(editingDraft ?? conversation.ai_draft!, true)}
                disabled={sendReply.isPending || closed}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={[styles.suggestSend, closed && styles.suggestSendOff]}>Send →</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* no parked draft — offer to have Mira write one */}
        {conversation && !conversation.ai_draft && !closed ? (
          <Pressable
            onPress={() =>
              generateDraft.mutate(conversation.id, {
                onError: (e) => setSendError(e instanceof Error ? e.message : 'Draft generation failed'),
              })
            }
            disabled={generateDraft.isPending}
            style={({ pressed }) => [styles.generatePill, (pressed || generateDraft.isPending) && styles.pressed]}
          >
            {generateDraft.isPending ? (
              <ActivityIndicator size="small" color={colors.accentDeep} />
            ) : (
              <Icon name="sparkle" size={13} color={colors.accentDeep} />
            )}
            <Text style={styles.generatePillText}>
              {generateDraft.isPending ? 'Mira is drafting…' : 'Ask Mira to draft a reply'}
            </Text>
          </Pressable>
        ) : null}

        {sendError ? <Text style={styles.sendErrorText}>{sendError}</Text> : null}

        <View style={[styles.composerRow, { paddingBottom: insets.bottom + space.sm }]}>
          <Pressable
            onPress={pickAndSendImage}
            disabled={attaching || closed}
            style={({ pressed }) => [styles.attachBtn, (pressed || attaching || closed) && styles.pressed]}
          >
            {attaching ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Icon name="plus" size={18} color={closed ? colors.textSubtle : colors.accentDeep} />
            )}
          </Pressable>
          <View style={styles.composerInputWrap}>
            <TextInput
              value={composer}
              onChangeText={setComposer}
              placeholder={closed ? 'Window closed' : 'Message…'}
              placeholderTextColor={colors.textSubtle}
              style={styles.composerInput}
              multiline
              editable={!closed}
              onSubmitEditing={() => onSend(composer)}
            />
            <Pressable
              onPress={() => onSend(composer)}
              disabled={!composer.trim() || sendReply.isPending || closed}
              style={({ pressed }) => [
                styles.sendBtn,
                composer.trim() && !closed && styles.sendBtnReady,
                (!composer.trim() || sendReply.isPending || closed) && styles.sendBtnOff,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="send" size={15} color={composer.trim() && !closed ? colors.accentFg : colors.glassText} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ThreadHeader({ conversation, title }: {
  conversation: { igsid: string; display_name: string | null; id: string; window_expires_at: number | null; human_agent_window_expires_at: number | null } | null;
  title: string;
}) {
  const insets = useInsets();
  const router = useRouter();
  return (
    <View style={[styles.headerRow, { paddingTop: insets.top + space.sm }]}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
        <Glass variant="light" radius={radius.pill} style={styles.backBtn}>
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </Glass>
      </Pressable>
      {conversation ? <LetterAvatar id={conversation.igsid || conversation.id} name={conversation.display_name} size={34} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {realHandle(conversation?.igsid) ? (
          <Text style={styles.headerHandle} numberOfLines={1}>@{realHandle(conversation?.igsid)}</Text>
        ) : null}
      </View>
      {conversation ? (
        <WindowChip
          windowExpiresAt={conversation.window_expires_at}
          humanAgentExpiresAt={conversation.human_agent_window_expires_at}
        />
      ) : null}
    </View>
  );
}

function MessageBubble({ message, latestOut, firstInGroup, lastInGroup, contact }: {
  message: CrmMessage;
  latestOut?: boolean;
  firstInGroup: boolean;
  lastInGroup: boolean;
  contact: { id: string; name: string | null } | null;
}) {
  const isOut = message.direction === 'out';
  const isAi = message.sent_by === 'ai';
  const text = message.body?.text ?? '';
  const imageUrl = typeof message.body?.imageUrl === 'string' ? message.body.imageUrl : null;
  if (!text && !imageUrl) return null;
  const time = formatTime(message.created_at);

  const corner = isOut
    ? lastInGroup ? styles.bubbleCornerOut : styles.bubbleMidOut
    : lastInGroup ? styles.bubbleCornerIn : styles.bubbleMidIn;

  // Telegram-style: the timestamp lives INSIDE the bubble, bottom-right
  const bubbleContent = (
    <>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.bubbleImage} /> : null}
      <View style={styles.bubbleTextRow}>
        {text ? (
          <Text style={[styles.bubbleText, isOut ? styles.bubbleTextOut : styles.bubbleTextIn]}>{text}</Text>
        ) : null}
        {time ? (
          <Text style={[styles.bubbleTime, isOut ? styles.bubbleTimeOut : styles.bubbleTimeIn]}>
            {latestOut ? '✓ ' : ''}{time}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={[styles.bubbleRow, isOut ? styles.bubbleRowOut : styles.bubbleRowIn, firstInGroup && styles.groupGap]}>
      {/* incoming: avatar sits beside the tail of the group, IG-style */}
      {!isOut && (
        <View style={styles.inAvatarSlot}>
          {lastInGroup && contact ? <LetterAvatar id={contact.id} name={contact.name} size={24} /> : null}
        </View>
      )}
      <View style={styles.bubbleCol}>
        {isAi && firstInGroup ? (
          <View style={styles.aiTag}>
            <Text style={styles.aiTagIcon}>✦</Text>
            <Text style={styles.aiTagText}>Mira</Text>
          </View>
        ) : null}
        {isOut ? (
          <LinearGradient
            colors={['#6a5fe6', '#5A5FE0', '#4a4fd0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, corner]}
          >
            {bubbleContent}
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleIn, corner]}>{bubbleContent}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.8 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: space.lg, paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16.5, fontWeight: '600', color: colors.text, letterSpacing: -0.3 },
  headerHandle: { fontSize: 11.5, color: colors.textSubtle, marginTop: 1 },

  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: space.md, marginTop: 4,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: 'rgba(209,67,67,0.08)',
  },
  closedBannerText: { flex: 1, fontSize: 11.5, lineHeight: 15, color: colors.stBlocked },
  sendErrorText: {
    marginHorizontal: space.md, marginBottom: 4,
    fontSize: 11.5, color: colors.stBlocked,
  },

  list: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md, flexGrow: 1, justifyContent: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: colors.textSubtle },

  bubbleRow: { flexDirection: 'row', marginTop: 2 },
  bubbleRowIn: { justifyContent: 'flex-start' },
  bubbleRowOut: { justifyContent: 'flex-end' },
  groupGap: { marginTop: 12 },
  inAvatarSlot: { width: 30, justifyContent: 'flex-end', paddingBottom: 18 },
  bubbleCol: { maxWidth: '76%' },

  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  aiTagIcon: { fontSize: 9.5, color: colors.accentDeep },
  aiTagText: { fontSize: 9.5, fontWeight: '500', letterSpacing: 0.3, color: colors.accentDeep },

  bubble: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 19 },
  bubbleIn: { backgroundColor: colors.bubbleThem },
  bubbleCornerIn: { borderBottomLeftRadius: 5 },
  bubbleCornerOut: { borderBottomRightRadius: 5 },
  bubbleMidIn: { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },
  bubbleMidOut: { borderTopRightRadius: 7, borderBottomRightRadius: 7 },
  bubbleTextRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 6 },
  bubbleText: { fontSize: 14.5, lineHeight: 20, flexShrink: 1 },
  bubbleTextIn: { color: colors.bubbleThemFg },
  bubbleTextOut: { color: '#ffffff' },
  bubbleTime: { fontSize: 9.5, marginBottom: 1 },
  bubbleTimeIn: { color: colors.textSubtle },
  bubbleTimeOut: { color: 'rgba(255,255,255,0.75)' },
  bubbleImage: { width: 200, height: 200, borderRadius: 13, marginBottom: 4, backgroundColor: colors.bgInset },

  dayRow: { alignItems: 'center', marginVertical: 12 },
  dayLabel: {
    fontSize: 11, fontWeight: '500', color: colors.textSubtle,
    backgroundColor: colors.bgInset, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999,
    overflow: 'hidden',
  },

  intro: { alignItems: 'center', paddingVertical: 26, gap: 5 },
  introName: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 6 },
  introHandle: { fontSize: 12.5, color: colors.textSubtle },
  introBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 10, paddingHorizontal: 16, height: 36, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    ...shadow.card,
  },
  introBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },

  generatePill: {
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: space.md, marginBottom: space.sm,
    paddingHorizontal: 14, height: 34, borderRadius: 999,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: 'rgba(90,95,224,0.25)',
  },
  generatePillText: { fontSize: 12.5, fontWeight: '600', color: colors.accentDeep },

  attachBtn: {
    width: 36, height: 36, borderRadius: 999,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },

  suggestPill: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: 'rgba(90,95,224,0.3)',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  suggestIcon: {
    width: 22, height: 22, borderRadius: 6, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestBody: { flex: 1, minWidth: 0 },
  suggestLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3, color: colors.accentDeep },
  suggestText: { fontSize: 13, color: colors.text, marginTop: 1 },
  suggestEdit: {
    flex: 1, minWidth: 0, fontSize: 13, color: colors.text,
    paddingVertical: 0, maxHeight: 90,
  },
  suggestActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  suggestSend: { fontSize: 12.5, fontWeight: '500', color: colors.accent },
  suggestSendOff: { opacity: 0.4 },

  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: space.sm,
    paddingHorizontal: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  composerInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 15,
    paddingRight: 5,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: colors.glassLightBg,
    borderWidth: 0.5, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.soft,
  },
  sendBtnReady: { backgroundColor: colors.accent, borderColor: colors.accent },
  sendBtnOff: { opacity: 0.4 },
});
