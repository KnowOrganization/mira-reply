import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/primitives';
import { useStatus } from '../src/api/hooks';
import { colors, radius, space } from '../src/theme';

// Campaigns (doc: Mira.dc.html:581-601) — one creative or funnel, staggered
// across many accounts, with results rolled up. The builder itself ships in
// Phase 2; this screen previews the concept with the doc's sample rows and
// a clear "not yet" notice rather than wiring up a fake data hook.
const SAMPLE_CAMPAIGNS = [
  { name: 'Summer drop', product: 'Comment→DM Funnel', accounts: '+2 more', status: 'Live', tone: 'done' as const },
  { name: 'Festive teaser', product: 'Publishing', accounts: '', status: 'Draft', tone: 'grey' as const },
];

export default function CampaignsScreen() {
  const { data: status } = useStatus<{ account?: { username?: string } | null }>();
  const handle = status?.account?.username;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Campaigns" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card glow style={styles.hero}>
          <Text style={styles.heroTitle}>What are Campaigns</Text>
          <Text style={styles.heroBody}>
            One creative or funnel, staggered across many accounts, with results rolled up — run a launch across a
            whole brand portfolio without touching each account by hand.
          </Text>
        </Card>

        <View style={styles.breadcrumb}>
          <Text style={styles.crumbMuted}>Agency</Text>
          <Text style={styles.crumbSep}>›</Text>
          <Text style={styles.crumbMuted}>Default brand</Text>
          <Text style={styles.crumbSep}>›</Text>
          <Text style={styles.crumbAccent}>{handle ? `@${handle}` : 'this account'}</Text>
        </View>

        {SAMPLE_CAMPAIGNS.map((c) => (
          <Card key={c.name} radius={radius.md} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{c.name}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {c.product}{c.accounts ? ` · ${handle ? `@${handle} ` : ''}${c.accounts}` : handle ? ` · @${handle}` : ''}
              </Text>
            </View>
            <Chip label={c.status} tone={c.tone} small />
          </Card>
        ))}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Campaign builder ships in Phase 2 — cross-account publishing + rolled-up analytics.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.lg, marginBottom: space.md },
  heroTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  heroBody: { fontSize: 13, lineHeight: 19.5, color: colors.textMuted, marginTop: 7 },

  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 2, marginBottom: space.md, flexWrap: 'wrap' },
  crumbMuted: { fontSize: 11.5, fontWeight: '500', color: colors.textMuted },
  crumbSep: { fontSize: 11.5, color: colors.textSubtle },
  crumbAccent: { fontSize: 11.5, fontWeight: '500', color: colors.accentDeep },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.sm },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 11.5, color: colors.textSubtle, marginTop: 2 },

  notice: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: space.lg,
    marginTop: space.xs,
  },
  noticeText: { fontSize: 13, lineHeight: 18.5, color: colors.textMuted, textAlign: 'center' },
});
