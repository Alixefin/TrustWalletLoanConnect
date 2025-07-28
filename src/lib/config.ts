// src/lib/config.ts
'use client'; // This file is used in client-side providers.

import { createConfig, http } from 'wagmi';
import {
  mainnet, // Ethereum Mainnet
  polygon, // Matic (Polygon Mainnet)
  optimism, // Optimism (for Worldcoin/WLD token)
  sepolia, // Ethereum Sepolia Testnet
  // Add other EVM chains your dApp uses (e.g., arbitrum, base, zora etc.)
} from 'wagmi/chains';

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
  phantomWallet, // For Solana connections
} from '@rainbow-me/rainbowkit/wallets';

// Get your WalletConnect Project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Please define it in your .env.local file.");
}

// 1. Define the chains your dApp supports for CONNECTION
// This includes EVM chains. Solana is handled by the Phantom connector.
const chains = [
  mainnet,
  polygon,
  optimism,
  sepolia,
  // Add more EVM chains your dApp interacts with if needed (e.g., arbitrum, base, zora)
] as const; // 'as const' is important for Wagmi/RainbowKit type inference

// 2. Define your custom list of wallet connectors and their order.
// CRUCIAL FIX: Provide UNCALLED wallet functions here.
const wallets = [
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet, // Pass the function reference, NOT metaMaskWallet({ ... })
      trustWallet,    // Pass the function reference
      coinbaseWallet, // Pass the function reference
      phantomWallet,  // Pass the function reference
    ],
  },
  {
    groupName: 'Other',
    wallets: [
      walletConnectWallet, // Pass the function reference
      injectedWallet,      // Pass the function reference
    ],
  },
];

// 3. Create the connectors array for Wagmi
// Pass projectId and chains in the SECOND argument here.
// connectorsForWallets will then automatically pass these to the wallet functions above.
const connectors = connectorsForWallets(wallets, {
  appName: 'Trust Wallet Loan Connect', // Your DApp's name
  projectId: projectId,
  // REMOVED: chains: chains, // <--- REMOVE THIS LINE
});

// 4. Create the Wagmi config
export const config = createConfig({
  connectors: connectors,
  chains: chains, // Pass the defined EVM chains here
  ssr: true, // Server-Side Rendering support

  // Define transports (RPC URLs) for your EVM chains
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [sepolia.id]: http(),
    // Add transports for any other EVM chains included in 'chains' array
  },
});