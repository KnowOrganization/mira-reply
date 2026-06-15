"use client";

import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// App-wide TanStack Query provider with a PERSISTED cache. On reload the cache
// rehydrates from localStorage synchronously and queries revalidate in the
// background — the dashboard paints instantly instead of waiting on a cold
// network fetch (the old behaviour: every reload refired 8+ queries from zero).
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // gcTime must be >= the persister maxAge or entries get evicted
            // before they can be restored.
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // One persister, always the same provider type (server + client) so there is
  // no hydration mismatch. On the server `storage` is undefined → the official
  // persister becomes a no-op; in the browser it reads/writes localStorage.
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: "mira.qcache",
      throttleTime: 1000,
    })
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24h
        buster: "v1", // bump when the query shapes change to drop stale caches
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
