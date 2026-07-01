import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Stat, SectionLabel } from '../src/components/primitives';
import { Icon } from '../src/components/Icon';
import { colors, radius, space } from '../src/theme';
import {
  useBrain,
  useBrainStats,
  useBrainStatus,
  useRebuildBrain,
} from '../src/api/hooks';
import { SkRepeat } from '../src/components/skeleton/primitives';
import { SkHomeHero, SkStatTile } from '../src/components/skeleton/units';

// ── data shapes (server-derived; see analytics-service.getBrain / getBrainStats) ──
type BrainFact = {
  id: string;
  question: string;
  answer: string;
  topic: string;
};
type BrainData = {
  facts: BrainFact[];
  byTopic: Record<string, number>;
  gaps: string[];
  total: number;
  account: { username: string } | null;
};
type BrainStats = {
  stats: unknown;
  tools: { name: string; description: string }[];
};

// builtAt → relative label per spec (<60s now, <60m Nm, <24h Nh, else Nd, null → never)
function rel(ts: number | null | undefined): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function BrainScreen() {
  const status = useBrainStatus();
  const brain = useBrain<BrainData>();
  const stats = useBrainStats<BrainStats>();
  const rebuild = useRebuildBrain();

  const ready = !!status.data?.builtAt;
  const tone = status.data?.toneSummary?.trim();
  const facts = brain.data?.facts ?? [];

  const statCards: { value: number; label: string }[] = [
    { value: brain.data?.total ?? status.data?.factCount ?? 0, label: 'Facts learned' },
    { value: status.data?.styleSampleCount ?? 0, label: 'Style samples' },
    { value: status.data?.kbCount ?? 0, label: 'Knowledge entries' },
    { value: stats.data?.tools.length ?? 0, label: 'Abilities' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Brain" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {status.isLoading ? (
          <>
            <SkHomeHero />
            <View style={styles.grid}>
              <SkRepeat n={4}>{(i) => <SkStatTile key={i} />}</SkRepeat>
            </View>
          </>
        ) : (
          <>
            {/* ── status hero ── */}
            <Card glow style={styles.hero}>
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: ready ? colors.stDone : colors.textSubtle },
                  ]}
                />
                <Text style={styles.heroState}>
                  {ready ? 'Brain ready' : 'Not trained'}
                </Text>
                <View style={styles.heroSpacer} />
                <Icon name="sparkle" size={18} color={colors.accent} />
              </View>
              <Text style={styles.heroMeta}>Last built {rel(status.data?.builtAt)}</Text>
              {tone ? <Text style={styles.quote}>“{tone}”</Text> : null}
            </Card>

            {ready ? (
              <>
                {/* ── stats bento ── */}
                <View style={styles.grid}>
                  {statCards.map((c) => (
                    <Card key={c.label} radius={radius.lg} style={styles.statCard}>
                      <Stat value={c.value} label={c.label} size={28} weight="600" />
                    </Card>
                  ))}
                </View>

                {/* ── rebuild ── */}
                <Pressable
                  onPress={() => rebuild.mutate()}
                  disabled={rebuild.isPending}
                  style={({ pressed }) => [
                    styles.rebuild,
                    pressed && styles.rebuildPressed,
                    rebuild.isPending && styles.rebuildDisabled,
                  ]}
                >
                  {rebuild.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.rebuildText}>Rebuild brain</Text>
                  )}
                </Pressable>

                {/* ── facts ── */}
                {facts.length > 0 ? (
                  <View style={styles.knows}>
                    <SectionLabel>what mira knows</SectionLabel>
                    <Card radius={radius.lg} style={styles.factList}>
                      {facts.slice(0, 15).map((f, i) => (
                        <View
                          key={f.id}
                          style={[styles.factRow, i > 0 && styles.factRowBorder]}
                        >
                          <Text style={styles.factQ} numberOfLines={1}>
                            {f.question}
                          </Text>
                          <Text style={styles.factA} numberOfLines={2}>
                            {f.answer}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  </View>
                ) : null}
              </>
            ) : (
              /* ── not trained ── */
              <Card style={styles.empty}>
                <Icon name="opps" size={30} color={colors.textSubtle} />
                <Text style={styles.emptyText}>
                  Brain not trained yet — connect Instagram and let Mira learn.
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingTop: 80, alignItems: 'center' },

  hero: { padding: space.xl, marginBottom: space.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 9, height: 9, borderRadius: radius.pill },
  heroState: { fontSize: 17, fontWeight: '600', color: colors.text, letterSpacing: -0.3 },
  heroSpacer: { flex: 1 },
  heroMeta: { marginTop: space.xs, fontSize: 13, color: colors.textMuted },
  quote: {
    marginTop: space.md,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginBottom: space.lg,
  },
  statCard: { flexGrow: 1, flexBasis: '46%', padding: space.lg },

  rebuild: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  rebuildPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  rebuildDisabled: { opacity: 0.6 },
  rebuildText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },

  knows: {},
  factList: { paddingHorizontal: space.lg },
  factRow: { paddingVertical: space.md },
  factRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  factQ: { fontSize: 14, fontWeight: '500', color: colors.text },
  factA: { marginTop: 2, fontSize: 13, lineHeight: 19, color: colors.textMuted },

  empty: { padding: space.xl, alignItems: 'center', gap: space.md },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
