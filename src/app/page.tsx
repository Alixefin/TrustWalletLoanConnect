// src/app/page.tsx
'use client'; // This page needs to be a Client Component

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Hero from '@/components/sections/hero';
import Benefits from '@/components/sections/benefits';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { address, isConnected, connector, chain } = useAccount();
  const router = useRouter();
  const hasLoggedConnection = useRef(false);

  useEffect(() => {
    // --- DEBUGGING LOGS START ---
    console.log('Home Component Mounted/Updated.');
    console.log('  isConnected:', isConnected);
    console.log('  address:', address);
    console.log('  chain:', chain?.name, chain?.id);
    console.log('  connector:', connector?.name);
    console.log('  hasLoggedConnection.current:', hasLoggedConnection.current);

    // Check conditions for logging
    const shouldLog = isConnected && address && chain && connector && !hasLoggedConnection.current;
    console.log('  Should attempt to log connection:', shouldLog);

    if (shouldLog) {
      console.log('--> Initiating logConnection for the first time for this connection.');
      hasLoggedConnection.current = true; // Mark as logged immediately

      const logConnection = async () => {
        try {
          console.log('    Sending POST request to /api/log_connection...');
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
            const errorText = await response.text();
            console.error('    Failed to send connection log:', response.status, response.statusText, errorText);
          } else {
            const data = await response.json();
            console.log('    Connection logged to backend successfully:', data);
          }
        } catch (error: any) {
          console.error('    Error sending connection log:', error.message || error);
        }
      };
      logConnection();
    } else if (!isConnected) {
      // Reset flag if disconnected, so next connection can be logged
      if (hasLoggedConnection.current) {
        console.log('<-- Wallet disconnected. Resetting hasLoggedConnection flag.');
      }
      hasLoggedConnection.current = false;
    }


    if (isConnected) { // Only redirect if a wallet is actually connected
        console.log('--> Wallet is connected. Redirecting to /dashboard...');
        router.push('/dashboard');
        // No return null here, the component will return null below.
    }
    console.log('Home Component useEffect completed.');
  }, [address, isConnected, connector, chain, router]);

  if (isConnected) {
    console.log('Home component returning null (redirecting or already redirected).');
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Benefits />
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <ConnectButton />
          {/* This text will be brief if redirect is fast */}
          {isConnected && (
            <p>Connected... redirecting to dashboard.</p>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}