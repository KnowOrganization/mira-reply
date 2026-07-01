import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Chip, Stat } from '../src/components/primitives';
import { Icon } from '../src/components/Icon';
import { colors, radius, space } from '../src/theme';

// Command Center (doc: Mira.dc.html:544-578) — every flagship the Instagram
// API can build, mapped against what Mira ships today. Static informational
// content; there's no live feature-catalog backend, so the flagship list and
// built/partial/new counts are ported verbatim from the doc's flagshipsM.
type Flagship = {
  n2: string;
  name: string;
  tag: string;
  b: number;
  p: number;
  w: number;
  auth?: boolean;
};

const FLAGSHIPS: Flagship[] = [
  { n2: '01', name: 'Conversational Inbox AI', tag: 'AI inbox — drafts & sends every DM under policy.', b: 2, p: 4, w: 8 },
  { n2: '02', name: 'Comment→DM Funnel Studio', tag: 'Comment a keyword → the asset lands in DMs.', b: 3, p: 2, w: 6 },
  { n2: '03', name: 'Brand Safety & Moderation', tag: 'Real-time comment defense with an audit trail.', b: 0, p: 3, w: 5 },
  { n2: '04', name: 'Live Commerce Studio', tag: 'Real-time tooling during an IG Live.', b: 0, p: 1, w: 5 },
  { n2: '05', name: 'Publishing & Content OS', tag: 'Create, schedule, publish across accounts.', b: 0, p: 0, w: 9 },
  { n2: '06', name: 'Growth Analytics', tag: 'The metrics that predict growth & virality.', b: 0, p: 2, w: 6 },
  { n2: '07', name: 'Competitive Intelligence', tag: 'Track rivals & your niche without following.', b: 0, p: 0, w: 7, auth: true },
  { n2: '08', name: 'Creator Economy Platform', tag: 'Vet, match, and measure creators.', b: 0, p: 1, w: 5, auth: true },
  { n2: '09', name: 'Social Commerce / Storefront', tag: 'Turn the inbox into a checkout.', b: 1, p: 2, w: 1 },
  { n2: '10', name: 'Lead Gen & Revenue CRM', tag: 'Every DM → a scored, attributed lead.', b: 0, p: 1, w: 4 },
  { n2: '11', name: 'Agency Command Center', tag: 'Agency → brand → account, campaigns across N.', b: 0, p: 2, w: 3 },
  { n2: '12', name: 'UGC & Rights Management', tag: 'Harvest tagged content + rights at scale.', b: 0, p: 2, w: 0 },
];

const TOTAL_BUILT = FLAGSHIPS.reduce((s, f) => s + f.b, 0);
const TOTAL_PARTIAL = FLAGSHIPS.reduce((s, f) => s + f.p, 0);
const TOTAL_NEW = FLAGSHIPS.reduce((s, f) => s + f.w, 0);

export default function CommandCenterScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Command Center" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card glow style={styles.hero}>
          <Text style={styles.heroTitle}>What is Command Center</Text>
          <Text style={styles.heroBody}>
            Every flagship the Instagram API can build, mapped against what Mira ships today — so you can see what to
            build next.
          </Text>
        </Card>

        <View style={styles.statsRow}>
          <Card radius={radius.md} style={styles.statCell}>
            <Stat value={TOTAL_BUILT} label="Built" size={20} color={colors.stDone} labelSize={11} />
          </Card>
          <Card radius={radius.md} style={styles.statCell}>
            <Stat value={TOTAL_PARTIAL} label="Partial" size={20} color={colors.stWarm} labelSize={11} />
          </Card>
          <Card radius={radius.md} style={styles.statCell}>
            <Stat value={TOTAL_NEW} label="New" size={20} color={colors.textSubtle} labelSize={11} />
          </Card>
        </View>

        {FLAGSHIPS.map((f) => (
          <Card key={f.n2} radius={radius.lg} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.rowIndex}>{f.n2}</Text>
              <Text style={styles.rowName} numberOfLines={1}>{f.name}</Text>
              {f.auth ? <Chip label="new auth" tone="grey" small /> : null}
            </View>
            <Text style={styles.rowTag}>{f.tag}</Text>
            <View style={styles.rowChips}>
              {f.b > 0 ? <Chip label={`${f.b} built`} tone="done" small /> : null}
              {f.p > 0 ? <Chip label={`${f.p} partial`} tone="warm" small /> : null}
              {f.w > 0 ? <Chip label={`${f.w} new`} tone="grey" small /> : null}
            </View>
          </Card>
        ))}

        <Pressable
          onPress={() => router.push('/roadmap')}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Icon name="clock" size={16} color={colors.accentDeep} />
          <Text style={styles.ctaText}>See what's coming next</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.lg, marginBottom: space.md },
  heroTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  heroBody: { fontSize: 13, lineHeight: 19.5, color: colors.textMuted, marginTop: 7 },

  statsRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  statCell: { flex: 1, padding: space.md },

  row: { padding: space.md, marginBottom: space.sm },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  rowIndex: { fontSize: 11, fontWeight: '500', color: colors.textSubtle },
  rowName: { fontSize: 14.5, fontWeight: '500', color: colors.text, letterSpacing: -0.2, flex: 1 },
  rowTag: { fontSize: 12.5, color: colors.textMuted, marginTop: 5, lineHeight: 17 },
  rowChips: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },

  cta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    borderRadius: radius.md,
    paddingVertical: space.md,
    marginTop: space.xs,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontSize: 13.5, fontWeight: '500', color: colors.text },
});
