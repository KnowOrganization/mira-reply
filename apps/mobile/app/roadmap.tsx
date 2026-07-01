import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { colors, radius, space } from '../src/theme';

// Roadmap / "Coming soon" (doc: Mira.dc.html:604-623) — flagships from Command
// Center that aren't shipping yet, surfaced as a calm static list rather than
// dead tiles on Home. Content ported verbatim from the doc's roadmapM.
const ROADMAP = [
  { name: 'Live Commerce', tag: 'Sell during an IG Live — Q&A queue, giveaway picker, keyword checkout.' },
  { name: 'Market Radar', tag: 'Track rivals and your niche without following anyone.' },
  { name: 'Creator Hub', tag: 'Vet, match, and measure influencers with trust scores.' },
  { name: 'Lead CRM', tag: 'Every DM becomes a scored, attributed, routable lead.' },
  { name: 'UGC & Rights', tag: 'Harvest tagged content and request reshare rights at scale.' },
  { name: 'Growth Insights', tag: 'Demographics, online-followers heatmap, hook-rate, save/share.' },
];

export default function RoadmapScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Coming soon" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card glow style={styles.hero}>
          <Text style={styles.heroTitle}>On the way</Text>
          <Text style={styles.heroBody}>
            Bigger Mira products we're building next. They'll show up in the app as they ship — nothing to set up
            yet.
          </Text>
        </Card>

        {ROADMAP.map((r) => (
          <Card key={r.name} radius={radius.md} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{r.name}</Text>
              <Text style={styles.rowTag}>{r.tag}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming soon</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: space.lg, marginBottom: space.lg },
  heroTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  heroBody: { fontSize: 13, lineHeight: 19.5, color: colors.textMuted, marginTop: 7 },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.md, marginBottom: space.sm },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14.5, fontWeight: '500', color: colors.text, letterSpacing: -0.2 },
  rowTag: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },

  badge: {
    backgroundColor: colors.bgInset,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  badgeText: { fontSize: 10, fontWeight: '500', color: colors.textSubtle },
});
