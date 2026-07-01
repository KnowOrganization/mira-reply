import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getToken, INTRO_SEEN_KEY } from '../src/auth';
import { useStatus } from '../src/api/hooks';
import { colors } from '../src/theme';

// Gate (mirrors web AppShell, extended with the doc's pre-app flow):
// no token → /signin; token but not connected → /intro (once) → /connect;
// connected but brain not ready → /brain-training; else → tabs.
export default function Index() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => { getToken().then(setToken); }, []);

  const { data: status, isLoading } = useStatus({ enabled: !!token });
  const connected = !!status?.connected;

  // Only needed on the signed-in-but-pre-connect path, so skip the lookup once
  // the account is already connected.
  const [introSeen, setIntroSeen] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (!token || connected) return;
    SecureStore.getItemAsync(INTRO_SEEN_KEY).then((v) => setIntroSeen(!!v));
  }, [token, connected]);

  if (token === undefined) return <Splash />;
  if (token === null) return <Redirect href="/signin" />;
  if (isLoading) return <Splash />;

  if (!connected) {
    if (introSeen === undefined) return <Splash />;
    if (!introSeen) return <Redirect href="/intro" />;
    return <Redirect href="/connect" />;
  }

  if (!status?.brainReady) return <Redirect href="/brain-training" />;
  return <Redirect href="/(tabs)/home" />;
}

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
