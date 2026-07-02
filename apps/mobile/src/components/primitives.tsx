import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, radius } from '../theme';

// color-mix(in srgb, X 14%, transparent) ≈ X at alpha .14 over the white card
const soft = (hex: string, a = 0.14) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ── Chip ─────────────────────────────────────────────────────────────────────
export type ChipTone = 'grey' | 'accent' | 'warm' | 'done' | 'blocked';
const CHIP: Record<ChipTone, { bg: string; fg: string }> = {
  grey: { bg: colors.bgInset, fg: colors.textMuted },
  accent: { bg: colors.accentSoft, fg: colors.accentDeep },
  warm: { bg: soft(colors.stWarm, 0.14), fg: colors.stWarm },
  done: { bg: soft(colors.stDone, 0.15), fg: colors.stDone },
  blocked: { bg: soft(colors.stBlocked, 0.14), fg: colors.stBlocked },
};

export function Chip({ label, tone = 'grey', small }: { label: string; tone?: ChipTone; small?: boolean }) {
  const c = CHIP[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }, small && styles.chipSmall]}>
      <Text style={[styles.chipText, { color: c.fg }, small && styles.chipTextSmall]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────
// Doc never uppercases these (sentence case, e.g. "Account", "Mira") — render
// verbatim, the tracked letter-spacing + subtle color do the "label" styling.
export function SectionLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return <Text style={[styles.section, style as never]}>{children}</Text>;
}

// ── Stat (number + label) ────────────────────────────────────────────────────
// Doc order varies by context: Opportunities summary cards are label-then-
// number; Profile stat cards are number-then-label. `labelFirst` picks which.
// Weight/letter-spacing follow the doc too: 500 default (Opportunities/Home),
// 600 only where the doc says so (Profile counts) — both overridable per call.
export function Stat({
  value, label, size = 23, color = colors.text, align = 'left', labelFirst = false, weight = '500', labelSize = 11.5, letterSpacing,
}: {
  value: string | number; label: string; size?: number; color?: string; align?: 'left' | 'center';
  labelFirst?: boolean; weight?: '500' | '600'; labelSize?: number; letterSpacing?: number;
}) {
  const numberNode = (
    <Text style={[styles.statValue, { fontSize: size, color, fontWeight: weight, letterSpacing: letterSpacing ?? size * -0.03 }]}>
      {value}
    </Text>
  );
  const labelNode = <Text style={[styles.statLabel, { fontSize: labelSize }]}>{label}</Text>;
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      {labelFirst ? (
        <>
          {labelNode}
          {numberNode}
        </>
      ) : (
        <>
          {numberNode}
          {labelNode}
        </>
      )}
    </View>
  );
}

// ── Toggle (custom track 48×29 + knob 23) ────────────────────────────────────
export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    // Doc's knob transition is a bouncy overshoot (cubic-bezier(.3,1.4,.5,1), .26s) —
    // approximate with a tuned spring (slight overshoot, settles quickly) rather
    // than a linear timing curve.
    Animated.spring(x, {
      toValue: value ? 1 : 0,
      friction: 7,
      tension: 145,
      useNativeDriver: false,
    }).start();
  }, [value, x]);
  const left = x.interpolate({ inputRange: [0, 1], outputRange: [3, 22] });
  const bg = x.interpolate({ inputRange: [0, 1], outputRange: [colors.borderStrong, colors.text] });
  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
      <Animated.View style={[styles.track, { backgroundColor: bg }]}>
        <Animated.View style={[styles.knob, { left }]} />
      </Animated.View>
    </Pressable>
  );
}

// ── Ring (confidence; number inside, no %) ───────────────────────────────────
export function Ring({ value, size = 44, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const v = Math.max(0, Math.min(100, value));
  // Doc's ring is inset within its box (44px box, r=17, stroke=4 — not
  // edge-to-edge), so subtract a fixed 3px margin rather than filling the box.
  const r = (size - stroke) / 2 - 3;
  const c = 2 * Math.PI * r;
  const fg = v >= 85 ? colors.stDone : v >= 70 ? colors.textMuted : colors.textSubtle;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgInset} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={fg} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 11, fontWeight: '500', color: fg }}>{Math.round(v)}</Text>
    </View>
  );
}

// ── SegmentedControl (bgInset track, sliding white thumb) ────────────────────
export function SegmentedControl({
  segments, index, onChange,
}: {
  segments: string[]; index: number; onChange: (i: number) => void;
}) {
  const pos = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.spring(pos, { toValue: index, damping: 20, stiffness: 250, useNativeDriver: false }).start();
  }, [index, pos]);
  const widthPct = 100 / segments.length;
  const left = pos.interpolate({
    inputRange: [0, segments.length - 1],
    outputRange: ['0%', `${100 - widthPct}%`],
  });
  return (
    <View style={styles.segTrack}>
      <Animated.View style={[styles.segThumb, { width: `${widthPct}%`, left }]} />
      {segments.map((s, i) => (
        <Pressable key={s} style={styles.segItem} onPress={() => onChange(i)}>
          <Text style={[styles.segLabel, i === index && styles.segLabelActive]} numberOfLines={1}>{s}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 7 },
  chipSmall: { paddingVertical: 4, paddingHorizontal: 8 },
  chipText: { fontSize: 10.5, fontWeight: '600' },
  chipTextSmall: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.4 },
  section: { fontSize: 11, fontWeight: '500', letterSpacing: 1, color: colors.textSubtle, marginBottom: 9, marginLeft: 2 },
  statValue: {},
  statLabel: { color: colors.textSubtle, marginTop: 2 },
  segTrack: {
    flexDirection: 'row', height: 36, borderRadius: radius.pill,
    backgroundColor: colors.bgInset, padding: 3, position: 'relative',
  },
  segThumb: {
    position: 'absolute', top: 3, bottom: 3, borderRadius: radius.pill,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segLabel: { fontSize: 12.5, fontWeight: '500', color: colors.textMuted },
  segLabelActive: { color: colors.text, fontWeight: '600' },
  track: { width: 48, height: 29, borderRadius: radius.pill, justifyContent: 'center' },
  knob: {
    position: 'absolute', width: 23, height: 23, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
});
