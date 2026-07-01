import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { colors, radius, space } from '../theme';

// Shared header for pushed sub-screens: glass back button + title (+ optional
// right-side action). Pairs with router.push from the tab screens.
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.row, { paddingTop: insets.top + space.sm }]}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
        <Glass variant="light" radius={radius.pill} style={styles.back}>
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </Glass>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.md },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '600', color: colors.text, letterSpacing: -0.5 },
  right: { minWidth: 40, alignItems: 'flex-end' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
