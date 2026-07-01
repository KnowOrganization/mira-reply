import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Icon } from '../../src/components/Icon';
import { colors, radius, space, shadow } from '../../src/theme';
import { useConversation, useSendReply, type CrmMessage } from '../../src/api/hooks';

// DM thread detail (Mira.dc.html:1143-1173): chat transcript with "Mira
// drafted" tags on AI-sent messages, a "Mira suggests" quick-send pill above
// the composer (driven by conversation.ai_draft, the parked unsent draft —
// not yet-sent ai messages, which already render inline in the transcript),
// and a fixed composer bar. Pushed from Inbox by tapping a card's identity row.

function displayName(name: string | null | undefined, igsid: string): string {
  return name?.trim() || (igsid ? `@${igsid}` : 'Conversation');
}

function formatTime(ms: number): string {
  const d = new Date(ms);
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
  const [composer, setComposer] = useState('');
  const listRef = useRef<FlatList<CrmMessage>>(null);

  const conversation = data?.conversation;
  const messages = data?.messages ?? [];

  useEffect(() => {
    // new messages land at the bottom (list is reversed — see below)
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [messages.length]);

  const onSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !id || sendReply.isPending) return;
    sendReply.mutate(
      { id, text: trimmed },
      { onSuccess: () => setComposer('') }
    );
  };

  const title = conversation ? displayName(conversation.display_name, conversation.igsid) : 'Thread';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.root}>
        <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
        <ScreenHeader
          title={title}
          right={conversation?.igsid ? <Text style={styles.handle} numberOfLines={1}>@{conversation.igsid}</Text> : null}
        />

        <FlatList
          ref={listRef}
          data={[...messages].reverse()}
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
          renderItem={({ item }) => <MessageBubble message={item} />}
        />

        {conversation?.ai_draft ? (
          <Pressable
            onPress={() => onSend(conversation.ai_draft!)}
            disabled={sendReply.isPending}
            style={({ pressed }) => [styles.suggestPill, pressed && styles.pressed]}
          >
            <View style={styles.suggestIcon}>
              <Icon name="sparkle" size={12} color={colors.accentFg} />
            </View>
            <View style={styles.suggestBody}>
              <Text style={styles.suggestLabel}>Mira suggests</Text>
              <Text style={styles.suggestText} numberOfLines={1}>{conversation.ai_draft}</Text>
            </View>
            <Text style={styles.suggestSend}>Send →</Text>
          </Pressable>
        ) : null}

        <View style={[styles.composerRow, { paddingBottom: insets.bottom + space.sm }]}>
          <View style={styles.composerInputWrap}>
            <TextInput
              value={composer}
              onChangeText={setComposer}
              placeholder="Message…"
              placeholderTextColor={colors.textSubtle}
              style={styles.composerInput}
              multiline
              onSubmitEditing={() => onSend(composer)}
            />
            <Pressable
              onPress={() => onSend(composer)}
              disabled={!composer.trim() || sendReply.isPending}
              style={({ pressed }) => [
                styles.sendBtn,
                (!composer.trim() || sendReply.isPending) && styles.sendBtnOff,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="send" size={15} color={colors.glassText} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: CrmMessage }) {
  const isOut = message.direction === 'out';
  const isAi = message.sent_by === 'ai';
  const text = message.body?.text ?? '';
  if (!text) return null;

  return (
    <View style={[styles.bubbleRow, isOut ? styles.bubbleRowOut : styles.bubbleRowIn]}>
      <View style={styles.bubbleCol}>
        {isAi ? (
          <View style={styles.aiTag}>
            <Text style={styles.aiTagIcon}>✦</Text>
            <Text style={styles.aiTagText}>Mira drafted</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.bubble,
            isOut ? styles.bubbleOut : styles.bubbleIn,
            isOut ? styles.bubbleCornerOut : styles.bubbleCornerIn,
          ]}
        >
          <Text style={[styles.bubbleText, isOut ? styles.bubbleTextOut : styles.bubbleTextIn]}>{text}</Text>
        </View>
        <Text style={[styles.timestamp, isOut ? styles.timestampOut : styles.timestampIn]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.8 },
  handle: { fontSize: 12, color: colors.textSubtle },

  list: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md, flexGrow: 1, justifyContent: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: colors.textSubtle },

  bubbleRow: { flexDirection: 'row', marginTop: 6 },
  bubbleRowIn: { justifyContent: 'flex-start' },
  bubbleRowOut: { justifyContent: 'flex-end' },
  bubbleCol: { maxWidth: '78%' },

  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  aiTagIcon: { fontSize: 9.5, color: colors.accentDeep },
  aiTagText: { fontSize: 9.5, fontWeight: '500', letterSpacing: 0.3, color: colors.accentDeep },

  bubble: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 19 },
  bubbleIn: { backgroundColor: colors.bubbleThem },
  bubbleOut: { backgroundColor: colors.text },
  bubbleCornerIn: { borderBottomLeftRadius: 4 },
  bubbleCornerOut: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTextIn: { color: colors.bubbleThemFg },
  bubbleTextOut: { color: '#ffffff' },

  timestamp: { fontSize: 10, color: colors.textSubtle, marginTop: 3 },
  timestampIn: { textAlign: 'left' },
  timestampOut: { textAlign: 'right' },

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
  suggestSend: { fontSize: 12.5, fontWeight: '500', color: colors.accent },

  composerRow: {
    paddingTop: space.sm,
    paddingHorizontal: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  composerInputWrap: {
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
  sendBtnOff: { opacity: 0.4 },
});
