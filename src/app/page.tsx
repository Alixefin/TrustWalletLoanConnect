// src/app/page.tsx
'use client'; // This page needs to be a Client Component

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Re-add useRouter for redirect
import { useAccount } from 'wagmi';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Hero from '@/components/sections/hero';
import Benefits from '@/components/sections/benefits';

import { ConnectButton } from '@rainbow-me/rainbowkit';


export default function Home() {
  const { address, isConnected, connector, chain } = useAccount();
  const router = useRouter(); // Re-add useRouter
  const hasLoggedConnection = useRef(false);

  useEffect(() => {
    // --- Logging Connection (remains the same) ---
    if (isConnected && address && chain && connector && !hasLoggedConnection.current) {
      hasLoggedConnection.current = true; // Mark as logged

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
      router.push('/dashboard'); // Redirect to dashboard page
    }
  }, [address, isConnected, connector, chain, router]); 
  if (isConnected) {
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Benefits />
        {/* ConnectButton can still be on the homepage for initial connection */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <ConnectButton />
          {/* You might not see this message often if redirect is fast */}
          {isConnected && (
            <p>Connected... redirecting to dashboard.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}