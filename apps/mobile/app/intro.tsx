import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { Icon, type IconName } from '../src/components/Icon';
import { colors, radius, space, shadow } from '../src/theme';
import { INTRO_SEEN_KEY } from '../src/auth';

// 3-slide carousel, content/copy ported verbatim from Mira.dc.html's `introSlides`
// (design/Mira.dc.html lines 85-101 + the dc-runtime controller that filled them).
type Slide = { icon: IconName; title: string; body: string };
const SLIDES: Slide[] = [
  {
    icon: 'chat',
    title: 'Mira reads every comment & DM',
    body: 'She watches your Instagram around the clock — every comment, every DM — so nothing slips through.',
  },
  {
    icon: 'sparkle',
    title: 'Replies in your voice',
    body: 'Mira learns your answers once and reuses them everywhere — in English or Hinglish. You always stay in control.',
  },
  {
    icon: 'tag',
    title: 'Turns DMs into deals',
    body: 'She spots buyers and brand deals, drafts the reply, and DMs links automatically — while you sleep.',
  },
];

// Intro carousel, shown once between sign-in and connect. Ported from the doc's
// stageIntro (design/Mira.dc.html:85-101). Button-driven (not swipe), matching
// the doc's introNext/introBack; dots double as direct-jump controls.
export default function Intro() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  async function finish() {
    try { await SecureStore.setItemAsync(INTRO_SEEN_KEY, '1'); } catch {}
    router.replace('/connect');
  }

  function onNext() {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />

      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={8}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Icon name={slide.icon} size={40} color={colors.accentDeep} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <Pressable key={s.title} onPress={() => setIndex(i)} hitSlop={8}>
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        {index > 0 && (
          <Pressable onPress={() => setIndex((i) => i - 1)} style={styles.backBtn}>
            <Icon name="chevronLeft" size={20} color={colors.textMuted} />
          </Pressable>
        )}
        <Pressable onPress={onNext} style={styles.nextBtn}>
          <Text style={styles.nextLabel}>{isLast ? 'Get started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 58, paddingBottom: 40, paddingHorizontal: space.xxl },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  skip: { fontSize: 14, fontWeight: '500', color: colors.textSubtle, padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 96, height: 96, borderRadius: radius.xl, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 27, fontWeight: '600', color: colors.text, letterSpacing: -0.7, lineHeight: 30, textAlign: 'center', marginTop: 30, maxWidth: 300 },
  body: { fontSize: 15, lineHeight: 23, color: colors.textMuted, textAlign: 'center', marginTop: 14, maxWidth: 300 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 20, backgroundColor: colors.text },
  footer: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  backBtn: {
    width: 52, height: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgElev, alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    flex: 1, height: 52, borderRadius: radius.lg, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center', ...shadow.soft,
  },
  nextLabel: { fontSize: 16, fontWeight: '500', color: colors.bgElev },
});
