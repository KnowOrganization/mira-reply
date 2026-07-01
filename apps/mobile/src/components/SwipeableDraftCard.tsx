import { Dimensions, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { colors } from '../theme';

// Swipe-to-send/skip wrapper for Inbox draft cards (Mira.dc.html:280-308, drag math
// at :1866-1871). Tap buttons stay the primary affordance; this is additive —
// swipe right past the threshold reveals/fires "Send" (green), swipe left
// reveals/fires "Skip". Below threshold the card springs back to centre.
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 92; // Mira.dc.html:1633 — dragX>92 approve, dragX<-92 skip
const EXIT_DISTANCE = SCREEN_WIDTH * 1.15; // mirrors translateX(115%) exit in the doc

type Props = {
  onSend: () => void;
  onSkip: () => void;
  /** Whether a right-swipe should actually fire send (mirrors the tap button's canSend). */
  canSend: boolean;
  /** Blocks the gesture entirely while a send/skip mutation is in flight. */
  disabled?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function SwipeableDraftCard({ onSend, onSkip, canSend, disabled, radius = 18, style, children }: Props) {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD && canSend) {
        translateX.value = withTiming(EXIT_DISTANCE, { duration: 260 }, (finished) => {
          if (finished) runOnJS(onSend)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-EXIT_DISTANCE, { duration: 260 }, (finished) => {
          if (finished) runOnJS(onSkip)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const sendRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const skipRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      <LinearGradient
        colors={[colors.stDone, '#155f43']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, styles.reveal]}
      >
        <Animated.View style={[styles.revealSide, sendRevealStyle]}>
          <Icon name="check" size={20} color="#fff" strokeWidth={2.4} />
          <Text style={styles.revealLabel}>Send</Text>
        </Animated.View>
        <Animated.View style={[styles.revealSide, skipRevealStyle]}>
          <Text style={styles.revealLabel}>Skip</Text>
          <Icon name="close" size={20} color="#fff" strokeWidth={2.4} />
        </Animated.View>
      </LinearGradient>
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  reveal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  revealSide: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealLabel: { fontSize: 14, fontWeight: '500', color: '#fff' },
});
