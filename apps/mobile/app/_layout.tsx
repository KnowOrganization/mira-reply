import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Root: gesture root (reanimated/gesture-handler) + safe-area + a persisted
// React Query cache + a headerless native stack.
//
// Persistence mirrors apps/web/src/components/Providers.tsx: on a warm
// relaunch the cache rehydrates from AsyncStorage and paints instantly while
// queries revalidate in the background, instead of every cold start refiring
// every screen's queries from zero (the old behaviour — a spinner/skeleton on
// every single navigation after every app reopen).
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: ONE_DAY_MS, retry: 1, refetchOnWindowFocus: false },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'mira.qcache',
  throttleTime: 1000,
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: ONE_DAY_MS, buster: 'v1' }}
      >
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
