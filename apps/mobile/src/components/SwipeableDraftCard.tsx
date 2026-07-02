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
import { haptics } from '../lib/haptics';
import { springs } from '../lib/springs';

// Swipe-to-send/skip wrapper for Inbox draft cards. Tap buttons stay the
// primary affordance; swipe right past the threshold fires "Send" (green
// reveal), swipe left fires "Skip" (neutral slate reveal — dismissal must
// never look like success). Crossing the threshold clicks via haptics so the
// commit point is legible without looking.
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 92;
const EXIT_DISTANCE = SCREEN_WIDTH * 1.15;

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
  const crossed = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      const over = Math.abs(e.translationX) > SWIPE_THRESHOLD ? 1 : 0;
      if (over !== crossed.value) {
        crossed.value = over;
        if (over) runOnJS(haptics.threshold)();
      }
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
        translateX.value = withSpring(0, springs.snappy);
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
      {/* two reveal layers: send = green (right), skip = neutral slate (left) */}
      <Animated.View style={[StyleSheet.absoluteFill, sendRevealStyle]}>
        <LinearGradient
          colors={[colors.stDone, '#155f43']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.reveal]}
        >
          <View style={styles.revealSide}>
            <Icon name="check" size={20} color="#fff" strokeWidth={2.4} />
            <Text style={styles.revealLabel}>Send</Text>
          </View>
        </LinearGradient>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, skipRevealStyle]}>
        <LinearGradient
          colors={['#3f3f46', '#26262b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.reveal, styles.revealRight]}
        >
          <View style={styles.revealSide}>
            <Text style={styles.revealLabel}>Skip</Text>
            <Icon name="close" size={20} color="#fff" strokeWidth={2.4} />
          </View>
        </LinearGradient>
      </Animated.View>
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
    paddingHorizontal: 24,
  },
  revealRight: { justifyContent: 'flex-end' },
  revealSide: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealLabel: { fontSize: 14, fontWeight: '500', color: '#fff' },
});
