import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card } from '../Card';
import { Chip } from '../primitives';
import { Icon } from '../Icon';
import { LetterAvatar } from '../LetterAvatar';
import { WindowChip, windowClosed } from '../WindowChip';
import { colors, shadow } from '../../theme';
import type { CrmConversationListItem } from '../../api/hooks';

// The inbox card: one decision per card, zero dead space. Draft cards are the
// hero (glowing surface, accent draft bubble, confidence ring); cards without
// a draft collapse to a compact quote + "Reply" row. Their message renders as
// a quote (thin left bar) instead of a heavy well. Confidence is a ring mark,
// never a number; risk forces the warm/blocked tone; low confidence exposes
// Mira's one-line reason. pending_slot turns the card into an "Ask" variant.

function displayName(c: CrmConversationListItem): string {
  return c.display_name?.trim() || (c.igsid ? `@${c.igsid}` : 'Conversation');
}

const HOT = new Set(['hot', 'qualified', 'opportunity']);

// 22pt confidence ring around the sparkle tile — a mark, not a number.
function ConfidenceMark({ confidence, risk }: { confidence: number | null; risk: string | null }) {
  const v = confidence == null ? null : Math.max(0, Math.min(1, confidence));
  const tone = risk === 'high' ? colors.stBlocked : risk === 'medium' || (v != null && v < 0.6) ? colors.stWarm : colors.accent;
  const size = 22;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.draftTileWrap}>
      {v != null && (
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgInset} strokeWidth={2} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth={2} fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      )}
      <View style={styles.draftTile}>
        <Icon name="sparkle" size={11} color={colors.accentDeep} />
      </View>
    </View>
  );
}

export function DraftCard({
  c, sending, skipping, generating,
  onOpenThread, onSend, onSkip, onEditDraft, onTrace, onCandidate, onLongPress, onGenerate,
}: {
  c: CrmConversationListItem;
  sending: boolean;
  skipping: boolean;
  generating?: boolean;
  onOpenThread: () => void;
  onSend: () => void;
  onSkip: () => void;
  onEditDraft: () => void;
  onTrace: () => void;
  onCandidate: (label: string) => void;
  onLongPress: () => void;
  onGenerate?: () => void;
}) {
  const closed = windowClosed(c);
  const hasDraft = !!c.ai_draft;
  const canSend = hasDraft && !closed && !sending && !skipping;
  const hot = HOT.has(c.lead_status);
  const lowConfidence = c.ai_confidence != null && c.ai_confidence < 0.6;
  const showReason = !!c.ai_reason && (lowConfidence || c.ai_risk === 'high' || c.ai_risk === 'medium');
  const isAsk = !!c.pending_slot;

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={350}>
      <Card radius={18} glow={hasDraft || isAsk} style={styles.card}>
        <View style={styles.inner}>
          {/* identity strip — compact, one line */}
          <View style={styles.topRow}>
            <Pressable onPress={onOpenThread} style={({ pressed }) => [styles.identityPress, pressed && styles.pressed]}>
              <LetterAvatar id={c.igsid || c.id} name={c.display_name} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{displayName(c)}</Text>
                {c.igsid && c.display_name ? (
                  <Text style={styles.handle} numberOfLines={1}>@{c.igsid}</Text>
                ) : null}
              </View>
            </Pressable>
            <WindowChip windowExpiresAt={c.window_expires_at} humanAgentExpiresAt={c.human_agent_window_expires_at} />
            {hot ? <Chip label={c.lead_status} tone="warm" small /> : null}
          </View>

          {/* their message — a quote, not a slab; or Mira's disambiguation ask */}
          {isAsk ? (
            <View style={styles.askWell}>
              <View style={styles.askHead}>
                <Icon name="sparkle" size={12} color={colors.accentDeep} />
                <Text style={styles.askLabel}>Mira asks</Text>
              </View>
              <Text style={styles.askQuestion}>{c.pending_slot?.question ?? 'Which one did they mean?'}</Text>
              {!!c.pending_slot?.candidates?.length && (
                <View style={styles.candidateRow}>
                  {c.pending_slot.candidates.slice(0, 4).map((cand) => (
                    <Pressable
                      key={cand.label}
                      onPress={() => onCandidate(cand.label)}
                      style={({ pressed }) => [styles.candidate, pressed && styles.pressed]}
                    >
                      <Text style={styles.candidateText} numberOfLines={1}>{cand.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : c.last_text ? (
            <View style={styles.quote}>
              <View style={styles.quoteBar} />
              <Text style={styles.quoteText} numberOfLines={2}>{c.last_text}</Text>
            </View>
          ) : null}

          {/* the draft — hero. Tap bubble = edit before send; tap mark = decision trace */}
          {hasDraft ? (
            <>
              <View style={styles.draftRow}>
                <Pressable onPress={onTrace} hitSlop={8}>
                  <ConfidenceMark confidence={c.ai_confidence} risk={c.ai_risk} />
                </Pressable>
                <Pressable onPress={onEditDraft} style={({ pressed }) => [styles.draftBubble, pressed && styles.pressed]}>
                  <Text style={styles.draftText} numberOfLines={4}>{c.ai_draft}</Text>
                </Pressable>
              </View>
              {showReason ? (
                <Text style={styles.reason} numberOfLines={1}>Why: {c.ai_reason}</Text>
              ) : null}

              <View style={styles.footer}>
                {c.referral?.source ? (
                  <View style={styles.referral}>
                    <Icon name="link" size={10} color={colors.textSubtle} />
                    <Text style={styles.referralText} numberOfLines={1}>via {c.referral.source}</Text>
                  </View>
                ) : <View />}
                <View style={styles.actions}>
                  <Pressable
                    onPress={onSkip}
                    disabled={skipping}
                    style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
                  >
                    {skipping ? (
                      <ActivityIndicator size="small" color={colors.textSubtle} />
                    ) : (
                      <Icon name="close" size={15} color={colors.textSubtle} />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={onSend}
                    disabled={!canSend}
                    style={({ pressed }) => [styles.sendBtn, !canSend && styles.sendBtnOff, pressed && styles.pressed]}
                  >
                    {sending ? (
                      <ActivityIndicator color={colors.accentFg} size="small" />
                    ) : closed ? (
                      <Text style={styles.sendLabel}>Closed</Text>
                    ) : (
                      <>
                        <Icon name="check" size={13} color={colors.accentFg} />
                        <Text style={styles.sendLabel}>Send</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          ) : !isAsk ? (
            // no draft, no ask — an unanswered thread: reply, or ask Mira to draft
            <View style={styles.noDraftRow}>
              <Pressable onPress={onOpenThread} style={({ pressed }) => [styles.replyRow, pressed && styles.pressed]}>
                <Icon name="message" size={13} color={colors.accentDeep} />
                <Text style={styles.replyText}>Reply</Text>
                <Icon name="chevronRight" size={13} color={colors.accentDeep} />
              </Pressable>
              {onGenerate ? (
                <Pressable
                  onPress={onGenerate}
                  disabled={generating}
                  style={({ pressed }) => [styles.replyRow, styles.generateRow, (pressed || generating) && styles.pressed]}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color={colors.accentDeep} />
                  ) : (
                    <Icon name="sparkle" size={13} color={colors.accentDeep} />
                  )}
                  <Text style={styles.replyText}>{generating ? 'Drafting…' : 'Draft with Mira'}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  card: {},
  inner: { padding: 12 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identityPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },
  handle: { fontSize: 10.5, color: '#9c9ca1', marginTop: 1 },

  quote: { flexDirection: 'row', gap: 8, marginTop: 9, paddingRight: 4 },
  quoteBar: { width: 2.5, borderRadius: 2, backgroundColor: colors.borderStrong },
  quoteText: { flex: 1, fontSize: 13, color: '#6b6b70', lineHeight: 18 },

  askWell: {
    marginTop: 9, backgroundColor: colors.accentSoft, borderRadius: 12,
    paddingVertical: 9, paddingHorizontal: 11,
  },
  askHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  askLabel: { fontSize: 10.5, fontWeight: '600', color: colors.accentDeep, letterSpacing: 0.3 },
  askQuestion: { fontSize: 13, color: colors.text, lineHeight: 18 },
  candidateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  candidate: {
    paddingHorizontal: 11, height: 28, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(90,95,224,0.3)',
    alignItems: 'center', justifyContent: 'center', maxWidth: 160,
  },
  candidateText: { fontSize: 12, fontWeight: '500', color: colors.accentDeep },

  draftRow: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  draftTileWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  draftTile: {
    width: 16, height: 16, borderRadius: 5, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  draftBubble: {
    flex: 1, backgroundColor: colors.accentSoft,
    borderWidth: 1, borderColor: 'rgba(90,95,224,0.22)',
    borderRadius: 12, borderTopLeftRadius: 3,
    paddingVertical: 9, paddingHorizontal: 11,
  },
  draftText: { fontSize: 13, color: '#18181b', lineHeight: 18.5 },
  reason: { marginTop: 6, marginLeft: 30, fontSize: 11, fontStyle: 'italic', color: colors.textSubtle },

  footer: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  referral: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  referralText: { fontSize: 10.5, color: '#9c9ca1' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skipBtn: {
    width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: '#ebebed',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  sendBtn: {
    height: 30, paddingHorizontal: 13, borderRadius: 9, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 5, ...shadow.card,
  },
  sendBtnOff: { backgroundColor: '#8e8e93', opacity: 0.6 },
  sendLabel: { fontSize: 12.5, fontWeight: '600', color: '#fff' },

  noDraftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyRow: {
    marginTop: 10, alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, height: 30, borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  generateRow: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(90,95,224,0.3)' },
  replyText: { fontSize: 12.5, fontWeight: '600', color: colors.accentDeep },
});
