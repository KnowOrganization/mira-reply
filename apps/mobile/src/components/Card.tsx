import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { colors, radius as radii, shadow } from '../theme';

// The workhorse content surface: solid white + 1px border + shadow-card, matching
// the design's content cards (NOT glass). `glow` adds the accent radial bloom
// top-right that the design uses on hero/info cards.
type Props = {
  radius?: number;
  glow?: boolean;
  elevated?: boolean; // shadow-soft instead of shadow-card
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Card({ radius = radii.lg, glow, elevated, style, children }: Props) {
  return (
    <View
      style={[
        styles.base,
        elevated ? shadow.soft : shadow.card,
        { borderRadius: radius },
        style,
      ]}
    >
      {glow ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="cardGlow" cx="92%" cy="2%" r="70%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.12} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardGlow)" rx={radius} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
