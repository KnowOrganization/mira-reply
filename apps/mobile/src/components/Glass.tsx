import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { colors, radius as radii, shadow } from '../theme';

// Glass surface = blur + translucent tint + hairline border, all absoluteFill
// BEHIND the children so `style` (padding/layout/height/margin) lays the
// children out normally and the glass fills the whole surface. Maps the doc's
// .glass-smoke / .glass-light. Reserved for nav bar / headers / small chips —
// content cards use <Card> (solid white).
type Props = {
  variant?: 'smoke' | 'light';
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function Glass({ variant = 'smoke', radius = radii.xl, style, children }: Props) {
  const tint = variant === 'smoke' ? colors.glassSmokeBg : colors.glassLightBg;
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, shadow.glass, style]}>
      <BlurView
        intensity={variant === 'smoke' ? 30 : 24}
        tint="light"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.border, { backgroundColor: tint, borderRadius: radius }]}
      />
      {/* top inset-highlight line (fakes the glass edge) */}
      <View pointerEvents="none" style={[styles.highlight, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  border: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder },
  highlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
