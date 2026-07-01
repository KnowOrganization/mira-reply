import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

// Mira brain hub — ports the "Mira brain · 6 agents live" visual from
// Mira.dc.html:347-348: a glowing core with 6 agent nodes orbiting it,
// connected by lines. The doc drives this with CSS SMIL <animate>/
// <animateTransform> (rotating node group, traveling dash lines, pulsing
// core/ping rings) — RN has no SMIL, so this ports the EFFECT, not the
// markup: the core pulse + a radar "ping" ring are real Reanimated loops
// (the one animation the doc cares must stay "alive"); the orbit ring and
// the 6 core→node connector lines are intentionally static dashed strokes
// (a traveling-dash version would need per-frame strokeDashoffset driving,
// not worth the complexity for a decorative hub) — simplification, not a bug.

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const WIDTH = 360;
const HEIGHT = 220;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const ORBIT_R = 92;
const NODE_R = 10;

// Sales/Analytics/Outreach/Comment/Guard/CRM — same 6 agents as the doc,
// evenly spaced 60° apart starting from the top.
const AGENTS = [
  { label: 'S', name: 'Sales' },
  { label: 'A', name: 'Analytics' },
  { label: 'O', name: 'Outreach' },
  { label: 'C', name: 'Comment' },
  { label: 'G', name: 'Guard' },
  { label: 'R', name: 'CRM' },
] as const;

const NODES = AGENTS.map((agent, i) => {
  const angle = (-90 + i * 60) * (Math.PI / 180);
  return {
    ...agent,
    x: CX + ORBIT_R * Math.cos(angle),
    y: CY + ORBIT_R * Math.sin(angle),
  };
});

export function BrainHub() {
  const pulse = useSharedValue(0);
  const ping = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, true);
    ping.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.ease) }), -1, false);
  }, [pulse, ping]);

  // core: gentle radius pulse, "alive" glow
  const coreProps = useAnimatedProps(() => ({
    r: 12.5 + pulse.value * 2.5,
  }));

  // radar ping: expanding ring that fades out, loops continuously
  const pingProps = useAnimatedProps(() => ({
    r: 13 + ping.value * 20,
    opacity: 0.6 * (1 - ping.value),
  }));

  return (
    <View style={styles.wrap}>
      <Svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%">
        <Defs>
          <RadialGradient id="brainHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.4} />
            <Stop offset="55%" stopColor={colors.accent} stopOpacity={0.15} />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* ambient halo behind the core */}
        <Circle cx={CX} cy={CY} r={68} fill="url(#brainHalo)" />

        {/* orbit guide ring */}
        <Circle
          cx={CX} cy={CY} r={ORBIT_R - 8}
          fill="none" stroke={colors.accent} strokeWidth={0.8} strokeDasharray="1 7" opacity={0.3}
        />

        {/* static connector lines, core -> each agent node */}
        {NODES.map((n) => (
          <Line
            key={`line-${n.name}`}
            x1={CX} y1={CY} x2={n.x} y2={n.y}
            stroke={colors.accent} strokeWidth={1.2} strokeDasharray="3 6" opacity={0.4}
          />
        ))}

        {/* radar ping (continuous expand + fade loop) */}
        <AnimatedCircle cx={CX} cy={CY} fill="none" stroke={colors.accent} strokeWidth={1.5} animatedProps={pingProps} />

        {/* pulsing glowing core */}
        <AnimatedCircle cx={CX} cy={CY} fill={colors.accent} animatedProps={coreProps} />
        <Circle cx={CX} cy={CY} r={3.5} fill="#ffffff" />

        {/* 6 agent nodes */}
        {NODES.map((n) => (
          <G key={n.name}>
            <Circle cx={n.x} cy={n.y} r={NODE_R} fill={colors.accentSoft} stroke={colors.accent} strokeWidth={1} />
            <SvgText
              x={n.x} y={n.y + 3.5}
              fontSize={10} fontWeight="600" fill={colors.accentDeep} textAnchor="middle"
            >
              {n.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: WIDTH / HEIGHT },
});
