import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Chip, Toggle, type ChipTone } from '../../src/components/primitives';
import { Icon } from '../../src/components/Icon';
import { colors, radius, space } from '../../src/theme';
import { useAutomations, usePatchAutomation } from '../../src/api/hooks';
import { SkRepeat } from '../../src/components/skeleton/primitives';
import { SkFlowCard } from '../../src/components/skeleton/units';
import type { Automation, AutomationTriggerType, AutomationNodeType } from '@shaiz/shared';

// Live Automations screen: lists IgStore automations, lets you enable/disable each
// (usePatchAutomation), and taps through to /flow/:id.
const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  comment_post: 'Comment',
  dm: 'DM',
  live_comment: 'Live comment',
  story_reply: 'Story reply',
};

const NODE_LABELS: Partial<Record<AutomationNodeType, string>> = {
  post_filter: 'Post filter',
  opening_message: 'Opening',
  text_message: 'Message',
  card_message: 'Card',
  image_message: 'Image',
  comment_reply: 'Public reply',
  ask_follow: 'Ask to follow',
  follow_gate: 'Follow gate',
  lead_form: 'Lead form',
  followup_message: 'Follow-up',
  giveaway: 'Giveaway',
  discount_code: 'Discount code',
  quiz: 'Quiz',
  tag_reward: 'Tag reward',
  ab_split: 'A/B split',
  price_reply: 'Price reply',
};

export default function Flows() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useAutomations();
  const patch = usePatchAutomation();

  const automations: Automation[] = data?.automations ?? [];
  const activeCount = automations.filter((a) => a.enabled).length;
  const totalCount = automations.length;

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
        {/* Header */}
        <Text style={styles.subline}>
          <Text style={styles.sublineStrong}>{activeCount}</Text> active · {totalCount} flows built
        </Text>

        {/* Quick-action row */}
        <View style={styles.quickRow}>
          <Pressable
            style={({ pressed }) => [styles.quickTileWrap, pressed && styles.pressed]}
            onPress={() => {
              // TODO inbox AI setup
            }}
          >
            <Card radius={14} style={styles.quickTile}>
              <View style={styles.quickTileIcon}>
                <Icon name="sparkle" size={17} color={colors.accentDeep} />
              </View>
              <Text style={styles.quickTileLabel}>Inbox AI setup</Text>
            </Card>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickTileWrap, pressed && styles.pressed]}
            onPress={() => {
              // TODO funnel results
            }}
          >
            <Card radius={14} style={styles.quickTile}>
              <View style={styles.quickTileIcon}>
                <Icon name="opps" size={17} color={colors.accentDeep} />
              </View>
              <Text style={styles.quickTileLabel}>Funnel results</Text>
            </Card>
          </Pressable>
        </View>

        {/* Big dashed Create automation */}
        <Pressable
          style={({ pressed }) => pressed && styles.pressed}
          onPress={() => {
            // TODO create
          }}
        >
          <View style={styles.createBlock}>
            <View style={styles.createIcon}>
              <Icon name="plus" size={30} strokeWidth={2.2} color="#fff" />
            </View>
            <View style={styles.createTextWrap}>
              <Text style={styles.createTitle}>Create automation</Text>
              <Text style={styles.createSub}>Start from scratch or a template</Text>
            </View>
          </View>
        </Pressable>

        {/* Flow list */}
        {isLoading ? (
          <View style={styles.list}>
            <SkRepeat n={4}>{(i) => <SkFlowCard key={i} />}</SkRepeat>
          </View>
        ) : automations.length === 0 ? null : (
          <View style={styles.list}>
            {automations.map((a) => (
              <FlowCard
                key={a.id}
                automation={a}
                onToggle={() => patch.mutate({ id: a.id, patch: { enabled: !a.enabled } })}
                onPress={() => router.push(`/flow/${a.id}`)}
              />
            ))}
          </View>
        )}

        {/* Bottom dashed New automation bar */}
        {automations.length > 0 ? (
          <Pressable
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => {
              // TODO new automation
            }}
          >
            <View style={styles.newBar}>
              <Icon name="plus" size={17} color={colors.textMuted} />
              <Text style={styles.newBarLabel}>New automation</Text>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function FlowCard({
  automation,
  onToggle,
  onPress,
}: {
  automation: Automation;
  onToggle: () => void;
  onPress: () => void;
}) {
  const { enabled, name, trigger, nodes, stats } = automation;
  const triggerLabel = TRIGGER_LABELS[trigger.type] ?? trigger.type;

  // node-type chips: drop the synthetic trigger node, label the rest
  const nodeLabels = nodes
    .filter((n) => n.type !== 'trigger')
    .map((n) => NODE_LABELS[n.type] ?? n.type);
  const shown = nodeLabels.slice(0, 3);
  const overflow = nodeLabels.length - shown.length;

  const chipItems: { label: string; tone: ChipTone }[] = [
    { label: triggerLabel, tone: 'warm' },
    ...shown.map((label) => ({ label, tone: 'accent' as ChipTone })),
  ];
  if (overflow > 0) chipItems.push({ label: `+${overflow}`, tone: 'grey' });

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card radius={radius.lg} style={styles.card}>
        {/* Head row */}
        <View style={styles.headRow}>
          <View style={[styles.iconTile, enabled ? styles.iconTileOn : styles.iconTileOff]}>
            <Icon name="flows" size={18} color={enabled ? colors.accentDeep : colors.textSubtle} />
          </View>
          <View style={styles.headMid}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <View style={[styles.runDot, { backgroundColor: enabled ? colors.stDone : colors.textSubtle }]} />
            </View>
            <Text style={styles.runs} numberOfLines={1}>
              {stats.triggered} runs · {stats.completed} completed
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textSubtle} />
        </View>

        {/* Step chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {chipItems.flatMap((c, i) => {
            const out = [];
            if (i > 0) {
              out.push(
                <Icon key={`sep-${i}`} name="chevronRight" size={11} color={colors.textSubtle} strokeWidth={2.4} />
              );
            }
            out.push(<Chip key={i} label={c.label} tone={c.tone} />);
            return out;
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.statusLabel, { color: enabled ? colors.stDone : colors.textSubtle }]}>
            {enabled ? 'Active' : 'Inactive'}
          </Text>
          <Toggle value={enabled} onValueChange={onToggle} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  // Header
  title: { fontSize: 32, fontWeight: '500', color: colors.text, letterSpacing: -1.3 },
  subline: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  sublineStrong: { color: colors.text, fontWeight: '600' },

  // Quick-action row
  quickRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  quickTileWrap: { flex: 1 },
  quickTile: { flex: 1, padding: 13, flexDirection: 'column', gap: 8 },
  quickTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTileLabel: { fontSize: 13.5, fontWeight: '500', color: colors.text, letterSpacing: -0.2 },

  // Big dashed create block
  createBlock: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    gap: 14,
    marginTop: space.lg,
  },
  createIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTextWrap: { alignItems: 'center', gap: 3 },
  createTitle: { fontSize: 16, fontWeight: '500', color: colors.text, letterSpacing: -0.3 },
  createSub: { fontSize: 13, color: colors.textSubtle },

  loading: { marginTop: space.xxl },

  // Flow list
  list: { marginTop: space.xl },
  card: { padding: 14, marginBottom: 11 },

  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileOn: { backgroundColor: colors.accentSoft },
  iconTileOff: { backgroundColor: colors.bgInset },
  headMid: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14.5, fontWeight: '500', color: colors.text, letterSpacing: -0.2, flexShrink: 1 },
  runDot: { width: 6, height: 6, borderRadius: 3 },
  runs: { fontSize: 11.5, color: colors.textSubtle, marginTop: 3 },

  chipScroll: { marginTop: 11 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  footer: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: { fontSize: 11.5, fontWeight: '500' },

  // Bottom dashed bar
  newBar: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newBarLabel: { fontSize: 13.5, fontWeight: '500', color: colors.textMuted },
});
