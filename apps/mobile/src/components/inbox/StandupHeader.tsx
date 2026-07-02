import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, space, shadow } from '../../theme';

// "While you were away" — Mira reporting to her boss, as a hero band: soft
// indigo gradient wash, headline numbers, autonomy pill on the right edge.

export type StandupNumbers = {
  handled: number;
  drafted: number;
  asked: number;
  flagged: number;
  valueInPlay: number;
};

export type DmMode = 'shadow' | 'assisted' | 'auto';

function Metric({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricN}>{n}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function StandupHeader({
  n, dmMode, onModeTap,
}: {
  n: StandupNumbers;
  dmMode: DmMode | null;
  onModeTap: () => void;
}) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(90,95,224,0.14)', 'rgba(90,95,224,0.03)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <Text style={styles.title}>While you were away</Text>
          <Pressable onPress={onModeTap} style={({ pressed }) => [styles.modePill, pressed && styles.pressed]}>
            <View style={[styles.modeDot, dmMode === 'auto' ? styles.dotAuto : dmMode === 'assisted' ? styles.dotAssisted : styles.dotShadow]} />
            <Text style={styles.modeText}>{dmMode ?? '…'}</Text>
          </Pressable>
        </View>
        <View style={styles.metricsRow}>
          <Metric n={n.handled} label="handled" />
          <View style={styles.divider} />
          <Metric n={n.drafted} label="drafted" />
          {n.asked > 0 && (
            <>
              <View style={styles.divider} />
              <Metric n={n.asked} label="asked" />
            </>
          )}
          {n.flagged > 0 && (
            <>
              <View style={styles.divider} />
              <Metric n={n.flagged} label="flagged" />
            </>
          )}
          {n.valueInPlay > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.metric}>
                <Text style={[styles.metricN, styles.money]}>${Math.round(n.valueInPlay / 100) / 10}k</Text>
                <Text style={styles.metricLabel}>in play</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  card: {
    marginTop: space.lg,
    borderRadius: 20,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: 'rgba(90,95,224,0.16)',
    overflow: 'hidden',
    ...shadow.card,
  },
  inner: { paddingHorizontal: 16, paddingVertical: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 10.5, fontWeight: '600', color: colors.accentDeep, letterSpacing: 1, textTransform: 'uppercase' },

  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  metric: {},
  metricN: { fontSize: 22, fontWeight: '600', color: colors.text, letterSpacing: -0.8 },
  metricLabel: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  money: { color: colors.accentDeep },
  divider: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: 'rgba(90,95,224,0.25)' },

  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, height: 28, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(90,95,224,0.2)',
  },
  modeDot: { width: 7, height: 7, borderRadius: 4 },
  dotShadow: { backgroundColor: colors.textSubtle },
  dotAssisted: { backgroundColor: colors.accent },
  dotAuto: { backgroundColor: colors.stDone },
  modeText: { fontSize: 12, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
});
