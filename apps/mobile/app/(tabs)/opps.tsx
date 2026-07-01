import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../src/components/Card';
import { Chip, Ring, Stat } from '../../src/components/primitives';
import { Icon } from '../../src/components/Icon';
import { BrainHub } from '../../src/components/BrainHub';
import { SkRepeat } from '../../src/components/skeleton/primitives';
import { SkOppCard } from '../../src/components/skeleton/units';
import { colors, radius, space } from '../../src/theme';
import { useOpportunities, useOpportunityStream, usePatchOpportunity, type Opportunity } from '../../src/api/hooks';

// Opportunities board — Mira surfaces leads from DMs. Solid-white card re-skin
// matching the Mira.dc.html design: stat row, filter chips, pipeline cards.

// ── status helpers ───────────────────────────────────────────────────────────
// the stage a lead advances to when you tap "Advance" (won/lost are terminal)
const NEXT_STATUS: Record<string, string | undefined> = {
  new: 'contacted',
  contacted: 'negotiating',
  review: 'negotiating',
  qualified: 'negotiating',
  negotiating: 'won',
  in_progress: 'won',
};

// pipeline position 0..3 for the stage bar fill
function stageIndex(status: string): number {
  switch (status) {
    case 'won':
      return 3;
    case 'negotiating':
    case 'in_progress':
      return 2;
    case 'contacted':
    case 'review':
    case 'qualified':
      return 1;
    default:
      return 0; // new / unknown
  }
}

// pipeline stepper labels, 1:1 with stageIndex() 0..3 (Mira.dc.html:367-378)
const STAGE_LABELS = ['New', 'Review', 'Negotiating', 'Won'] as const;

// design filter -> set of real statuses it matches ('All' = everything)
const FILTERS = ['All', 'New', 'Review', 'Negotiating', 'Won'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_MATCH: Record<Exclude<Filter, 'All'>, string[]> = {
  New: ['new'],
  Review: ['contacted', 'review', 'qualified'],
  Negotiating: ['negotiating', 'in_progress'],
  Won: ['won'],
};

function matchesFilter(status: string, filter: Filter): boolean {
  if (filter === 'All') return true;
  return FILTER_MATCH[filter].includes(status);
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function avatarBg(conf: number): string {
  if (conf >= 90) return '#52525b';
  if (conf >= 80) return '#3f3f46';
  return '#71717a';
}

// ── pipeline stepper (inset track + 4 dot/label nodes, Mira.dc.html:367-378) ──
function StageStepper({ stage }: { stage: number }) {
  return (
    <View style={styles.stageWrap}>
      <View style={styles.stageTrackBg} />
      <View style={[styles.stageTrackFill, { width: `${(stage / 3) * 84}%` }]} />
      <View style={styles.stageDotsRow}>
        {STAGE_LABELS.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <View key={label} style={styles.stageDotCol}>
              <View
                style={[
                  styles.stageDot,
                  done
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : active
                    ? { backgroundColor: '#ffffff', borderColor: colors.accent }
                    : { backgroundColor: '#ffffff', borderColor: colors.borderStrong },
                ]}
              />
              <Text
                style={[
                  styles.stageDotLabel,
                  { color: active ? colors.text : done ? colors.textMuted : colors.textSubtle },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── card ─────────────────────────────────────────────────────────────────────
function OppCard({ opp, onAdvance }: { opp: Opportunity; onAdvance: (o: Opportunity) => void }) {
  const name = opp.display_name?.trim() || (opp.igsid ? `@${opp.igsid}` : 'Lead');
  const handle = opp.igsid ? `@${opp.igsid}` : '';
  const body = opp.reason ?? opp.last_text ?? null;
  const conf = opp.confidence <= 1 ? opp.confidence * 100 : opp.confidence;
  const stage = stageIndex(opp.status);
  const isWon = opp.status === 'won';
  const next = NEXT_STATUS[opp.status];
  const initial = name.replace(/^@/, '').charAt(0).toUpperCase() || '?';

  return (
    <Card radius={18} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarBg(conf) }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {handle ? <Text style={styles.handle} numberOfLines={1}>{handle}</Text> : null}
        </View>
        <Ring value={conf} />
      </View>

      <View style={styles.typeRow}>
        <Chip label={cap(opp.type.replace('_', ' '))} tone="grey" />
        {opp.value_estimate != null ? (
          <Text style={styles.value}>${opp.value_estimate}</Text>
        ) : null}
      </View>

      {body ? <Text style={styles.body} numberOfLines={2}>{body}</Text> : null}

      <StageStepper stage={stage} />

      {isWon ? (
        <View style={styles.wonPill}>
          <Text style={styles.wonText}>
            🎉 Closed won{opp.value_estimate != null ? ` · $${opp.value_estimate}` : ''}
          </Text>
        </View>
      ) : next ? (
        <Pressable
          onPress={() => onAdvance(opp)}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Advance to {STAGE_LABELS[stage + 1]}</Text>
          <Icon name="chevronRight" size={14} color="#ffffff" />
        </Pressable>
      ) : null}
    </Card>
  );
}

// ── screen ───────────────────────────────────────────────────────────────────
export default function Opps() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useOpportunities();
  const { connected } = useOpportunityStream();
  const patch = usePatchOpportunity();
  const [filter, setFilter] = useState<Filter>('All');

  const opps = data?.opportunities ?? [];

  const openCount = opps.filter((o) => o.status !== 'won' && o.status !== 'lost').length;
  const wonCount = opps.filter((o) => o.status === 'won').length;
  const winRate = opps.length ? Math.round((wonCount / opps.length) * 100) : 0;

  const visible = opps.filter((o) => matchesFilter(o.status, filter));

  const advance = (o: Opportunity) => {
    const next = NEXT_STATUS[o.status];
    if (next) patch.mutate({ id: o.id, status: next });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: insets.top + space.lg,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.live}>
            <View style={[styles.liveDot, { backgroundColor: connected ? colors.stDone : colors.textSubtle }]} />
            <Text style={[styles.liveText, { color: connected ? colors.stDone : colors.textSubtle }]}>
              {connected ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.brainCaption}>
          <View style={styles.brainDot} />
          <Text style={styles.brainCaptionText}>Mira brain · 6 agents live</Text>
        </View>
        <BrainHub />

        <View style={styles.statRow}>
          <Card radius={18} style={styles.statCard}>
            <Stat value={openCount} label="Open value" size={23} labelFirst labelSize={12} />
          </Card>
          <Card radius={18} style={styles.statCard}>
            <Stat value={wonCount} label="Won / mo" size={23} labelFirst labelSize={12} />
          </Card>
          <Card radius={18} style={styles.statCard}>
            <Stat value={`${winRate}%`} label="Win rate" size={23} color={colors.stDone} labelFirst labelSize={12} />
          </Card>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, active ? styles.filterChipOn : styles.filterChipOff]}
              >
                <Text style={[styles.filterText, active ? styles.filterTextOn : styles.filterTextOff]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <SkRepeat n={4}>{(i) => <SkOppCard key={i} />}</SkRepeat>
        ) : visible.length === 0 ? (
          <Card radius={18} style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="opps" size={26} color={colors.accentDeep} />
            </View>
            <Text style={styles.emptyText}>No opportunities yet — Mira surfaces leads from your DMs.</Text>
          </Card>
        ) : (
          visible.map((opp) => <OppCard key={opp.id} opp={opp} onAdvance={advance} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: radius.pill },
  liveText: { fontSize: 13, fontWeight: '500' },

  brainCaption: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: space.lg, paddingHorizontal: 2 },
  brainDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  brainCaptionText: { fontSize: 12.5, fontWeight: '500', color: colors.textSubtle },

  statRow: { flexDirection: 'row', gap: 11, marginTop: space.lg },
  statCard: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 15,
    // doc's bespoke two-layer card shadow (Mira.dc.html:328), distinct from
    // the global shadow-card token — a deeper, purple-tinted ambient layer.
    shadowColor: 'rgba(60,50,95,1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.09, shadowRadius: 22, elevation: 4,
  },

  filterRow: { gap: 8, marginTop: space.lg, paddingRight: space.xl },
  filterChip: {
    height: 34, borderRadius: 999, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  filterChipOn: { backgroundColor: '#18181b' },
  filterChipOff: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border },
  filterText: { fontSize: 12.5, fontWeight: '500' },
  filterTextOn: { color: '#ffffff' },
  filterTextOff: { color: colors.textMuted },

  center: { paddingTop: space.xxl, alignItems: 'center', justifyContent: 'center' },

  empty: { marginTop: space.lg, padding: space.xl, alignItems: 'center', gap: space.md },
  emptyIcon: {
    width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  card: { padding: 15, marginBottom: 12, marginTop: space.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '500', color: '#ffffff' },
  headerText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: colors.text, letterSpacing: -0.2 },
  handle: { fontSize: 12, color: colors.textSubtle, marginTop: 1 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 },
  value: { marginLeft: 'auto', fontSize: 21, fontWeight: '500', color: colors.text, letterSpacing: -0.5 },

  body: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 10 },

  stageWrap: { position: 'relative', marginTop: 16, paddingHorizontal: 2 },
  stageTrackBg: { position: 'absolute', top: 6, left: '8%', right: '8%', height: 2, backgroundColor: colors.border },
  stageTrackFill: { position: 'absolute', top: 6, left: '8%', height: 2, backgroundColor: colors.accent },
  stageDotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stageDotCol: { alignItems: 'center', gap: 6, flex: 1 },
  stageDot: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 2 },
  stageDotLabel: { fontSize: 9, fontWeight: '500' },

  cta: {
    height: 38, borderRadius: 11, backgroundColor: '#18181b', flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  ctaText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
  pressed: { opacity: 0.85 },

  wonPill: {
    height: 38, borderRadius: 11, marginTop: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(31,157,107,0.15)',
  },
  wonText: { fontSize: 13.5, fontWeight: '500', color: colors.stDone },
});
