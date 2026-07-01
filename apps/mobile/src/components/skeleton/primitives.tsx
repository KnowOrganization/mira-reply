import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../Card';
import { colors, radius as radii } from '../../theme';

// Skeleton atoms. The shimmer is a translucent gradient band that sweeps
// left→right over a flat bgInset base — built on reanimated + linear-gradient
// (both already deps), no new libs. `SkCard` wraps the real `<Card>` frame
// (solid border + shadow) around shimmering children — that's what makes a
// loading card read as "this card is loading", not a generic gray block.

const SWEEP_MS = 1100;

function useSweep() {
  const x = useSharedValue(-1);
  x.value = withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }), -1, false);
  return useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 220 }],
  }));
}

function Shimmer({ style }: { style: StyleProp<ViewStyle> }) {
  const sweepStyle = useSweep();
  return (
    <View style={[style, styles.clip]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgInset }]} />
      <Animated.View style={[styles.sweepWrap, sweepStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function Skeleton({ w, h, r = 6, circle, style }: {
  w?: number | `${number}%`; h: number; r?: number; circle?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const size = circle ? { width: h, height: h, borderRadius: h / 2 } : { width: w ?? '100%', height: h, borderRadius: r };
  return <Shimmer style={[size, style]} />;
}

export const SkLine = ({ w = '100%', h = 12, r = 5, style }: {
  w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle>;
}) => <Skeleton w={w} h={h} r={r} style={style} />;

export const SkCircle = ({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) => (
  <Skeleton h={size} circle style={style} />
);

export const SkChip = ({ w = 60, h = 22, style }: { w?: number; h?: number; style?: StyleProp<ViewStyle> }) => (
  <Skeleton w={w} h={h} r={radii.sm} style={style} />
);

export const SkThumb = ({ size = 56, r = radii.md, style }: { size?: number; r?: number; style?: StyleProp<ViewStyle> }) => (
  <Skeleton w={size} h={size} r={r} style={style} />
);

export function SkCard({ children, p = 15, radius = radii.lg, style }: {
  children: React.ReactNode; p?: number; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card radius={radius} style={[{ padding: p }, style]}>
      {children}
    </Card>
  );
}

export function SkRepeat({ n, children }: { n: number; children: (i: number) => React.ReactNode }) {
  return <>{Array.from({ length: n }, (_, i) => children(i))}</>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  sweepWrap: { position: 'absolute', top: 0, bottom: 0, width: 90 },
});
