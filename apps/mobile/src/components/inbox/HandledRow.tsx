import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LetterAvatar } from '../LetterAvatar';
import { colors } from '../../theme';
import type { CrmConversationListItem } from '../../api/hooks';

// One-line receipt for a conversation Mira already handled — the audit trail
// that builds trust in autonomy without demanding attention. Confidence shows
// as a colored dot, never a number.

export function HandledRow({ c, onPress }: { c: CrmConversationListItem; onPress: () => void }) {
  const name = c.display_name?.trim() || (c.igsid ? `@${c.igsid}` : 'Conversation');
  const verb = c.ai_decision === 'sent' || c.last_direction === 'out' ? 'Replied' : 'Reviewed';
  const conf = c.ai_confidence;
  const dot = conf == null ? colors.borderStrong : conf >= 0.8 ? colors.stDone : conf >= 0.6 ? colors.stWarm : colors.stBlocked;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <LetterAvatar id={c.igsid || c.id} name={c.display_name} size={24} />
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.verb} numberOfLines={1}>
        {verb}
        {c.ai_reason ? ` · ${c.ai_reason}` : ''}
      </Text>
      <View style={[styles.dot, { backgroundColor: dot }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingVertical: 9, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  name: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: 120 },
  verb: { flex: 1, fontSize: 12, color: colors.textSubtle },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
