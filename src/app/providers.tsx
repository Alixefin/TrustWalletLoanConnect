
'use client';

import * as React from 'react';

import {
  RainbowKitProvider,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { config } from '../lib/config'; 
import '@rainbow-me/rainbowkit/styles.css'; 

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return new QueryClient();
  } else {
    if (!browserQueryClient) {
      browserQueryClient = new QueryClient();
    }
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = React.useRef(getQueryClient());

  return (
    // REMOVED: <SessionProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient.current}>
          <RainbowKitProvider theme={lightTheme()}>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    // REMOVED: </SessionProvider>
  );
}