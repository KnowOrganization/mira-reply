import { Tabs } from 'expo-router';
import { GlassTabBar } from '../../src/components/GlassTabBar';

// Custom floating glass tab bar. Order matters: inbox is the 3rd (center) tab.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <GlassTabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="opps" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="flows" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
