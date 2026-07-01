import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Stat, SectionLabel } from '../src/components/primitives';
import { colors, space } from '../src/theme';
import { useDashboard, useCrmAnalytics } from '../src/api/hooks';

// Mira.dc.html:919-970 (ANALYTICS route) — account-growth 3-stat row, coverage
// split bar, 4-stat grid, 14-day reply bar chart, reply-intent breakdown.
//
// /api/ig/dashboard shape (apps/api/src/services/analytics-service.ts
// getDashboard) — only the fields this screen renders. Same pattern as the
// locally-declared `Dashboard` type in app/(tabs)/home.tsx.
type Dashboard = {
  coverage: number;
  totalComments: number;
  totalReplies: number;
  days: { date: string; comments: number; replies: number }[];
  intents: Record<string, number>;
};

// Doc's intent rows (Mira.dc.html:961-967) are server-labeled buckets with no
// fixed enum — cycle a small palette rather than hardcoding labels we don't
// actually get back from getDashboard().
const INTENT_PALETTE = [colors.accent, colors.stDone, colors.stWarm, colors.accentDeep, colors.stBlocked, colors.textMuted];

function formatResponseTime(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return `${h}h`;
}

export default function AnalyticsScreen() {
  const { data: dash, isLoading: dashLoading } = useDashboard<Dashboard>();
  const { data: crm, isLoading: crmLoading } = useCrmAnalytics();

  const coverage = dash?.coverage ?? 0;
  const totalComments = dash?.totalComments ?? 0;
  const totalReplies = dash?.totalReplies ?? 0;
  const needsCount = Math.max(0, totalComments - totalReplies);
  const handledPct = Math.max(0, Math.min(100, coverage));
  const needsPct = 100 - handledPct;

  const days = dash?.days ?? [];
  const maxReplies = Math.max(1, ...days.map((d) => d.replies));

  const intents = Object.entries(dash?.intents ?? {}).sort((a, b) => b[1] - a[1]);
  const maxIntent = Math.max(1, ...intents.map(([, n]) => n));

  const loading = dashLoading && crmLoading;

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Analytics" />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentDeep} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Account growth — 3-stat row (Mira.dc.html:921-930) */}
          <SectionLabel style={styles.sectionLabel}>Account growth</SectionLabel>
          <View style={styles.row3}>
            <Card radius={15} style={styles.row3Tile}>
              <Stat value={totalComments} label="comments" size={20} weight="500" labelSize={9.5} />
            </Card>
            <Card radius={15} style={styles.row3Tile}>
              <Stat value={totalReplies} label="replies sent" size={20} weight="500" labelSize={9.5} />
            </Card>
            <Card radius={15} style={styles.row3Tile}>
              <Stat value={`${coverage}%`} label="covered" size={20} weight="500" labelSize={9.5} />
            </Card>
          </View>

          {/* Coverage split bar (Mira.dc.html:931-941) */}
          <Card radius={16} style={styles.card}>
            <Text style={styles.cardLabel}>Comments handled vs needs you</Text>
            <View style={styles.splitBar}>
              <View style={[styles.splitSeg, { width: `${handledPct}%`, backgroundColor: colors.stDone }]} />
              <View style={[styles.splitSeg, { width: `${needsPct}%`, backgroundColor: colors.stWarm }]} />
            </View>
            <View style={styles.splitLegendRow}>
              <Text style={styles.splitLegend}>
                <Text style={[styles.splitLegendStrong, { color: colors.stDone }]}>{totalReplies}</Text> handled by Mira
              </Text>
              <Text style={styles.splitLegend}>
                <Text style={[styles.splitLegendStrong, { color: colors.stWarm }]}>{needsCount}</Text> need you
              </Text>
            </View>
          </Card>

          {/* 4-stat grid (useCrmAnalytics) (Mira.dc.html:942-950) */}
          <View style={styles.grid}>
            <Card radius={15} style={styles.gridTile}>
              <Stat value={formatResponseTime(crm?.avgResponseMs)} label="avg response time" size={26} weight="500" labelSize={10} />
            </Card>
            <Card radius={15} style={styles.gridTile}>
              <Stat value={crm?.leadsCaptured ?? 0} label="leads captured" size={26} weight="500" labelSize={10} />
            </Card>
            <Card radius={15} style={styles.gridTile}>
              <Stat value={crm?.contactsTotal ?? 0} label="contacts" size={26} weight="500" labelSize={10} />
            </Card>
            <Card radius={15} style={styles.gridTile}>
              <Stat value={crm?.pendingDrafts ?? 0} label="pending drafts" size={26} weight="500" labelSize={10} />
            </Card>
          </View>

          {/* 14-day reply bar chart (Mira.dc.html:951-958) */}
          <Card radius={16} style={styles.card}>
            <Text style={styles.cardLabel}>Replies — last 14 days</Text>
            {days.length > 0 ? (
              <View style={styles.chartRow}>
                {days.map((d) => {
                  const h = Math.max(3, (d.replies / maxReplies) * 96);
                  return (
                    <View key={d.date} style={styles.chartCol}>
                      <View style={[styles.chartBar, { height: h, opacity: d.replies > 0 ? 1 : 0.22 }]} />
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>Not enough data yet</Text>
            )}
          </Card>

          {/* Reply intents breakdown (Mira.dc.html:959-968) */}
          <Card radius={16} style={[styles.card, styles.lastCard]}>
            <Text style={[styles.cardLabel, styles.intentsLabel]}>Reply intents</Text>
            {intents.length > 0 ? (
              intents.map(([label, n], i) => (
                <View key={label} style={styles.intentRow}>
                  <Text style={styles.intentLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <View style={styles.intentTrack}>
                    <View
                      style={[
                        styles.intentFill,
                        { width: `${Math.max(4, (n / maxIntent) * 100)}%`, backgroundColor: INTENT_PALETTE[i % INTENT_PALETTE.length] },
                      ]}
                    />
                  </View>
                  <Text style={styles.intentValue}>{n}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Check back once you have more activity</Text>
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: space.lg, paddingBottom: 40 },

  sectionLabel: { marginTop: 0 },

  // account growth — 3-stat row
  row3: { flexDirection: 'row', gap: 11 },
  row3Tile: { flex: 1, padding: 12 },

  // shared card chrome
  card: { padding: 16, marginTop: 13 },
  lastCard: { marginBottom: space.md },
  cardLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, color: colors.textSubtle },
  emptyText: { fontSize: 13, color: colors.textSubtle, marginTop: 10 },

  // coverage split bar
  splitBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.bgInset,
    marginTop: 11,
  },
  splitSeg: { height: '100%' },
  splitLegendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  splitLegend: { fontSize: 12, color: colors.textMuted },
  splitLegendStrong: { fontWeight: '600' },

  // 4-stat grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 13 },
  gridTile: { flexGrow: 1, flexBasis: '46%', padding: 14 },

  // 14-day chart
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 96, marginTop: 14 },
  chartCol: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: '100%' },
  chartBar: { width: '100%', borderRadius: 3, backgroundColor: colors.accent },

  // intents
  intentsLabel: { marginBottom: 11 },
  intentRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
  intentLabel: { width: 78, fontSize: 12, color: colors.textMuted, flexShrink: 0, textTransform: 'capitalize' },
  intentTrack: { flex: 1, height: 8, borderRadius: 5, backgroundColor: colors.bgInset, overflow: 'hidden' },
  intentFill: { height: '100%', borderRadius: 5 },
  intentValue: { fontSize: 11.5, fontWeight: '500', width: 24, textAlign: 'right', color: colors.text },
});
