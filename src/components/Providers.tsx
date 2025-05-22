// src/components/Providers.tsx
"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // infinite freshness
      retry: false,        // no automatic retries
    },
  },
});

const networks = { testnet: { url: getFullnodeUrl("testnet") } };

export function Providers({ children }: { children: React.ReactNode }) {
  // only create persister in browser
  const [persister, setPersister] = useState<ReturnType<typeof createSyncStoragePersister> | null>(null);

  useEffect(() => {
    // guard so this runs only on client
    const p = createSyncStoragePersister({ storage: window.localStorage });
    setPersister(p);
  }, []);

  // while persister is uninitialized, just render the plain QueryClientProvider
  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} defaultNetwork="testnet">
          <WalletProvider>{children}</WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    );
  }

  // once we have a persister, wrap in PersistQueryClientProvider
  return (
    <QueryClientProvider client={queryClient}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <SuiClientProvider networks={networks} defaultNetwork="testnet">
          <WalletProvider>{children}</WalletProvider>
        </SuiClientProvider>
      </PersistQueryClientProvider>
    </QueryClientProvider>
  );
}
