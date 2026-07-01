import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Toggle, Chip } from '../src/components/primitives';
import { Icon } from '../src/components/Icon';
import { SkRepeat } from '../src/components/skeleton/primitives';
import { SkRuleCard } from '../src/components/skeleton/units';
import { colors, space, radius } from '../src/theme';
import {
  useModerationRules, useCreateModRule, useUpdateModRule, useDeleteModRule,
  useCrisisMode, useSetCrisis, useFlaggedModeration, useResolveFlagged,
  useBlockedUsers, useUnblockUser, type ModRule,
} from '../src/api/hooks';

// Guard Center — 3-way segmented (Flagged / Auto-flag / Blocklist), doc:
// Mira.dc.html:974-1042. Crisis kill-switch sits fixed under the segments.

const SEGMENTS = ['Flagged', 'Auto-flag', 'Blocklist'] as const;
type Segment = (typeof SEGMENTS)[number];

const CATEGORIES = [
  { key: 'spam', label: 'Spam', sub: 'Bulk/promo links and obvious bot comments' },
  { key: 'scam', label: 'Scams', sub: 'Crypto, giveaway, and phishing patterns' },
  { key: 'hate', label: 'Hate speech', sub: 'Slurs and targeted harassment' },
  { key: 'nsfw', label: 'NSFW', sub: 'Sexually explicit content' },
] as const;

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Guard() {
  const [segment, setSegment] = useState<Segment>('Flagged');
  const { data: crisis } = useCrisisMode();
  const setCrisis = useSetCrisis();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Guard Center" />

      {/* Segmented control */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentTrack}>
          {SEGMENTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSegment(s)}
              style={[styles.segmentBtn, segment === s && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, segment === s && styles.segmentTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Crisis kill-switch — fixed, not in scroll */}
      <View style={[styles.crisisBanner, crisis?.armed && styles.crisisBannerArmed]}>
        <Icon name="bell" size={18} color={crisis?.armed ? colors.stBlocked : colors.textMuted} />
        <View style={styles.crisisText}>
          <Text style={[styles.crisisTitle, crisis?.armed && { color: colors.stBlocked }]}>Crisis kill-switch</Text>
          <Text style={styles.crisisSub}>
            {crisis?.armed ? 'ARMED — every new comment is auto-hidden.' : 'Off — your rules moderate only.'}
          </Text>
        </View>
        <Pressable
          onPress={() => setCrisis.mutate(!crisis?.armed)}
          style={[styles.crisisPill, crisis?.armed && styles.crisisPillArmed]}
        >
          <Text style={[styles.crisisPillText, crisis?.armed && styles.crisisPillTextArmed]}>
            {crisis?.armed ? 'Disarm' : 'Arm'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {segment === 'Flagged' && <FlaggedSegment />}
        {segment === 'Auto-flag' && <AutoFlagSegment />}
        {segment === 'Blocklist' && <BlocklistSegment />}
      </ScrollView>
    </View>
  );
}

// ── Flagged queue ──────────────────────────────────────────────────────────
function FlaggedSegment() {
  const { data, isLoading } = useFlaggedModeration();
  const resolve = useResolveFlagged();
  const items = data?.flagged ?? [];

  if (isLoading) return <SkRepeat n={3}>{(i) => <SkRuleCard key={i} />}</SkRepeat>;
  if (!items.length) {
    return (
      <Card radius={16} style={styles.emptyCard}>
        <Text style={styles.emptyText}>Nothing flagged — Guard is quiet.</Text>
      </Card>
    );
  }

  return (
    <>
      {items.map((item) => (
        <Card key={item.id} radius={16} style={styles.flagCard}>
          <View style={styles.flagHead}>
            <View style={styles.flagAvatar}>
              <Text style={styles.flagAvatarText}>{(item.fromUsername || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.flagHeadText}>
              <Text style={styles.flagName} numberOfLines={1}>{item.fromUsername || item.fromUserId}</Text>
              <Text style={styles.flagMeta}>{relTime(item.ts)}</Text>
            </View>
            <Chip label={item.ruleType || 'flagged'} tone="warm" small />
          </View>
          <View style={styles.flagBubble}>
            <Text style={styles.flagBubbleText}>{item.text}</Text>
          </View>
          <View style={styles.flagActions}>
            <Pressable
              onPress={() => resolve.mutate({ id: item.id, action: 'allow' })}
              style={[styles.flagBtn, styles.flagBtnOutline]}
            >
              <Text style={styles.flagBtnOutlineText}>Allow</Text>
            </Pressable>
            <Pressable
              onPress={() => resolve.mutate({ id: item.id, action: 'hide' })}
              style={[styles.flagBtn, styles.flagBtnOutline]}
            >
              <Text style={styles.flagBtnOutlineText}>Hide</Text>
            </Pressable>
            <Pressable
              onPress={() => resolve.mutate({ id: item.id, action: 'block' })}
              style={[styles.flagBtn, styles.flagBtnBlock]}
            >
              <Text style={styles.flagBtnBlockText}>Block</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </>
  );
}

// ── Auto-flag categories + keyword blocklist ─────────────────────────────────
function AutoFlagSegment() {
  const { data, isLoading } = useModerationRules();
  const createRule = useCreateModRule();
  const updateRule = useUpdateModRule();
  const deleteRule = useDeleteModRule();
  const [keyword, setKeyword] = useState('');

  const rules: ModRule[] = data?.rules ?? [];
  const categoryRules = new Map(rules.filter((r) => r.type === 'category').map((r) => [r.pattern, r]));
  const keywordRules = rules.filter((r) => r.type === 'keyword');

  function toggleCategory(key: string, on: boolean) {
    const existing = categoryRules.get(key);
    if (existing) updateRule.mutate({ id: existing.id, patch: { enabled: on } });
    else if (on) createRule.mutate({ type: 'category', pattern: key, action: 'flag' });
  }

  function addKeyword() {
    const k = keyword.trim();
    if (!k) return;
    createRule.mutate({ type: 'keyword', pattern: k, action: 'flag' });
    setKeyword('');
  }

  if (isLoading) return <SkRepeat n={3}>{(i) => <SkRuleCard key={i} />}</SkRepeat>;

  return (
    <>
      <Text style={styles.sectionLabel}>Auto-flag categories</Text>
      <Card radius={15} style={styles.listCard}>
        {CATEGORIES.map((c, i) => (
          <View key={c.key} style={[styles.toggleRow, i < CATEGORIES.length - 1 && styles.rowDivider]}>
            <View style={styles.toggleRowText}>
              <Text style={styles.toggleLabel}>{c.label}</Text>
              <Text style={styles.toggleSub}>{c.sub}</Text>
            </View>
            <Toggle value={!!categoryRules.get(c.key)?.enabled} onValueChange={(v) => toggleCategory(c.key, v)} />
          </View>
        ))}
      </Card>

      <Text style={styles.sectionLabel}>Keyword blocklist</Text>
      <View style={styles.chipWrap}>
        {keywordRules.map((r) => (
          <View key={r.id} style={styles.keywordChip}>
            <Text style={styles.keywordChipText}>{r.pattern}</Text>
            <Pressable onPress={() => deleteRule.mutate(r.id)} hitSlop={6}>
              <Icon name="close" size={12} color={colors.accentDeep} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.addKeywordRow}>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={addKeyword}
          placeholder="Add a keyword…"
          placeholderTextColor={colors.textSubtle}
          style={styles.addKeywordInput}
        />
        <Pressable onPress={addKeyword} style={styles.addKeywordBtn}>
          <Icon name="plus" size={16} color={colors.accentFg} />
        </Pressable>
      </View>
    </>
  );
}

// ── Blocklist ──────────────────────────────────────────────────────────────
function BlocklistSegment() {
  const { data, isLoading } = useBlockedUsers();
  const unblock = useUnblockUser();
  const blocked = data?.blocked ?? [];

  if (isLoading) return <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />;
  if (!blocked.length) {
    return (
      <Card radius={16} style={styles.emptyCard}>
        <Text style={styles.emptyText}>No one's blocked.</Text>
      </Card>
    );
  }

  return (
    <Card radius={15} style={styles.listCard}>
      {blocked.map((u, i) => (
        <View key={u.igUserId} style={[styles.blockRow, i < blocked.length - 1 && styles.rowDivider]}>
          <View style={styles.flagAvatar}>
            <Text style={styles.flagAvatarText}>{(u.username || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.blockName} numberOfLines={1}>{u.username || u.igUserId}</Text>
          <Pressable onPress={() => unblock.mutate(u.igUserId)} style={styles.unblockPill}>
            <Text style={styles.unblockText}>Unblock</Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  segmentWrap: { paddingHorizontal: space.xl, paddingTop: space.sm },
  segmentTrack: { flexDirection: 'row', backgroundColor: colors.bgInset, borderRadius: 11, padding: 3 },
  segmentBtn: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: colors.bgElev, ...shadowCard() },
  segmentText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  segmentTextActive: { color: colors.text },

  crisisBanner: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    marginHorizontal: space.xl, marginTop: space.md, padding: 11,
    borderRadius: 14, backgroundColor: colors.bgInset,
  },
  crisisBannerArmed: { backgroundColor: '#fdeaea' },
  crisisText: { flex: 1 },
  crisisTitle: { fontSize: 13.5, fontWeight: '500', color: colors.text },
  crisisSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  crisisPill: { height: 30, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.bgElev, alignItems: 'center', justifyContent: 'center' },
  crisisPillArmed: { backgroundColor: colors.stBlocked },
  crisisPillText: { fontSize: 12.5, fontWeight: '600', color: colors.text },
  crisisPillTextArmed: { color: '#fff' },

  sectionLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle, textTransform: 'uppercase', marginTop: space.lg, marginBottom: space.sm, marginLeft: 2 },

  listCard: { borderRadius: 15, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md },
  toggleRowText: { flex: 1, marginRight: space.md },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  toggleSub: { fontSize: 11.5, color: colors.textSubtle, marginTop: 2 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  keywordChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 11,
  },
  keywordChipText: { fontSize: 12.5, fontWeight: '500', color: colors.accentDeep },
  addKeywordRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  addKeywordInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.bgElev,
  },
  addKeywordBtn: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },

  emptyCard: { padding: space.xl, alignItems: 'center', marginTop: space.md },
  emptyText: { fontSize: 14, color: colors.textMuted },

  flagCard: { padding: 14, marginBottom: space.md },
  flagHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flagAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' },
  flagAvatarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  flagHeadText: { flex: 1 },
  flagName: { fontSize: 14, fontWeight: '500', color: colors.text },
  flagMeta: { fontSize: 11.5, color: colors.textSubtle, marginTop: 1 },
  flagBubble: { backgroundColor: colors.bgInset, borderRadius: 11, padding: 10, marginTop: space.sm },
  flagBubbleText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  flagActions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  flagBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flagBtnOutline: { borderWidth: 1, borderColor: colors.border },
  flagBtnOutlineText: { fontSize: 13, fontWeight: '500', color: colors.text },
  flagBtnBlock: { backgroundColor: colors.stBlocked },
  flagBtnBlockText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  blockRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  blockName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  unblockPill: { height: 30, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  unblockText: { fontSize: 12.5, fontWeight: '500', color: colors.text },
});

function shadowCard() {
  return { shadowColor: '#14151a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 };
}
