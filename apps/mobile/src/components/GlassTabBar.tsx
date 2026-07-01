import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { useDrafts } from '../api/hooks';
import { colors } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Floating glass-smoke capsule (design "Option C"). Active tab = dark #18181b
// pill (icon + label) sized to its content; inactive = icon-only #9c9ca1, each
// flex:1 to share the remaining width evenly. No center FAB.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const META: Record<string, { icon: IconName; label: string }> = {
  home: { icon: 'home', label: 'Home' },
  opps: { icon: 'opps', label: 'Opportunities' },
  inbox: { icon: 'inbox', label: 'Inbox' },
  flows: { icon: 'flows', label: 'Flows' },
  you: { icon: 'user', label: 'You' },
};

export function GlassTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: drafts } = useDrafts();
  const draftCount = Array.isArray(drafts)
    ? drafts.length
    : (drafts as { drafts?: unknown[] } | undefined)?.drafts?.length ?? 0;

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <Glass variant="smoke" radius={23} style={styles.bar}>
        {state.routes.map((route, i) => {
          const meta = META[route.name];
          if (!meta) return null;
          const focused = state.index === i;
          const onPress = () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          const showDot = route.name === 'inbox' && draftCount > 0;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                focused ? styles.tabActive : styles.tabIdle,
                pressed && styles.pressed,
              ]}
            >
              <View>
                <Icon name={meta.icon} size={23} strokeWidth={1.7} color={focused ? colors.accentFg : colors.textSubtle} />
                {showDot ? <View style={styles.dot} /> : null}
              </View>
              {focused ? (
                <Text style={styles.label} numberOfLines={1}>{meta.label}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  // space-between spreads all 5 tabs edge-to-edge and can never push one
  // off-screen (gaps clamp to >=0) — robust vs the fragile flex-grow approach.
  bar: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  tab: { height: 44, minWidth: 44, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabIdle: {},
  tabActive: { paddingHorizontal: 15, backgroundColor: colors.text },
  label: { color: colors.accentFg, fontSize: 13.5, fontWeight: '500', letterSpacing: -0.1, marginLeft: 8, maxWidth: 90 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  dot: {
    position: 'absolute', top: -2, right: -3, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.stBlocked, borderWidth: 1.5, borderColor: colors.glassSmokeBg,
  },
});
