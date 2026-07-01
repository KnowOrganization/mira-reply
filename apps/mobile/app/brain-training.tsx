import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../src/components/Icon';
import { colors, radius, space, shadow } from '../src/theme';
import { useBrainStatus } from '../src/api/hooks';

// Chips ported verbatim from Mira.dc.html's `brainChips` (design/Mira.dc.html:129-143).
const CHIPS = ['"free shipping over ₹999 ✨"', '"DM kar diya link 🔥"', '"thank you so much 🥹"'];

// "Training your brain" interstitial, shown after Instagram connects and before
// the brain is ready. Ported from the doc's stageBrain. The doc's progress bar
// is a static placeholder (78%); here it's a timed fill capped below 100% until
// useBrainStatus() reports a real build (builtAt set), then it completes and
// auto-advances into the app.
export default function BrainTraining() {
  const router = useRouter();
  const { data: status } = useBrainStatus();
  const ready = !!status?.builtAt;
  const [progress, setProgress] = useState(8);
  const navigated = useRef(false);

  function finish() {
    if (navigated.current) return;
    navigated.current = true;
    router.replace('/(tabs)/home');
  }

  // Timed fill while waiting, capped at 92% so it never looks "done" before the
  // brain actually is.
  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + (92 - p) * 0.12 + 1));
    }, 450);
    return () => clearInterval(id);
  }, [ready]);

  // Snap to 100% once ready, then auto-enter after a beat.
  useEffect(() => {
    if (!ready) return;
    setProgress(100);
    const id = setTimeout(finish, 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Icon name="sparkle" size={34} color={colors.accentDeep} />
        </View>
        <Text style={styles.title}>Training your brain</Text>
        <Text style={styles.body}>
          Mira is learning your voice from your recent replies & captions, so every draft sounds like you.
        </Text>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>

        <View style={styles.chips}>
          {CHIPS.map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable onPress={finish} style={styles.enterBtn}>
        <Text style={styles.enterLabel}>Enter Mira</Text>
      </Pressable>
      <Pressable onPress={finish} style={styles.skipBtn}>
        <Text style={styles.skipLabel}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingBottom: 40, paddingHorizontal: space.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 96, height: 96, borderRadius: radius.xl, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '600', color: colors.text, letterSpacing: -0.6, marginTop: 28 },
  body: { fontSize: 14.5, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 12, maxWidth: 300 },
  track: { width: '100%', maxWidth: 300, height: 6, borderRadius: 4, backgroundColor: colors.bgInset, marginTop: 24, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 },
  chip: {
    borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 13,
    backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  chipText: { fontSize: 12.5, color: colors.textMuted },
  enterBtn: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center', ...shadow.soft,
  },
  enterLabel: { fontSize: 16, fontWeight: '500', color: colors.bgElev },
  skipBtn: { marginTop: 10, alignItems: 'center', padding: 8 },
  skipLabel: { fontSize: 13, fontWeight: '500', color: colors.textSubtle },
});
