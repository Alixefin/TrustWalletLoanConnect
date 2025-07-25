// src/wagmiConfig.ts
'use client';

import { createConfig, http } from 'wagmi';
import {
  // Import all your desired built-in chains
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
  sepolia,
  goerli,
  polygonMumbai,
} from 'wagmi/chains';

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  trustWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';

// IMPORTANT: Import `Chain` from wagmi for type assertion
import type { Chain } from 'wagmi/chains'; // Use `type` import as it's only a type

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. " +
    "Please define it in your .env.local file. " +
    "You can get one from https://dashboard.reown.com/"
  );
}

// --- Define your Custom Chain(s) ---
// Note: `iconUrl` and `iconBackground` are RainbowKit-specific metadata.
// They are NOT part of Wagmi's `Chain` type.
// We'll define them here, but apply them in `src/providers.tsx` later.
const customAvalancheChain = {
  id: 43_114,
  name: 'Avalanche',
  nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.avax.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'SnowTrace', url: 'https://snowtrace.io' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 11_907_934,
    },
  },
} as const satisfies Chain; // Assert it satisfies Wagmi's `Chain` type (without iconUrl/background)


// --- Define the Chains your dApp supports ---
// This is the array that will be passed to `createConfig`.
// Use `as const` here to create a readonly tuple, satisfying `createConfig`'s strict type.
// Ensure at least one chain is always present.
const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
  sepolia,
  goerli,
  polygonMumbai,
  customAvalancheChain, // Include your custom chain here
] as const; // <--- This `as const` is CRITICAL for the `chains` error

// --- Define Custom Wallet List and Order ---
const wallets = [
  {
    groupName: 'Popular Wallets',
    wallets: [
      trustWallet,
      metaMaskWallet,
      coinbaseWallet,
    ],
  },
  {
    groupName: 'Other Options',
    wallets: [
      walletConnectWallet,
      injectedWallet,
    ],
  },
];

// --- Create the connectors array using connectorsForWallets ---
const connectors = connectorsForWallets(wallets, {
  appName: 'Trust Wallet Loan Connect',
  projectId: projectId,
});

// --- Create the Wagmi Config directly using `createConfig` ---
export const config = createConfig({
  connectors: connectors,
  chains: chains, // Pass the `as const` typed chains array here
  ssr: true,

  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [zora.id]: http(),
    [sepolia.id]: http(),
    [goerli.id]: http(),
    [polygonMumbai.id]: http(),
    [customAvalancheChain.id]: http(), // Add transport for your custom chain
  },
});