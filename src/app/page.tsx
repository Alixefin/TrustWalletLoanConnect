'use client'; // This page needs to be a Client Component

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; 
import { useAccount } from 'wagmi'; 

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Hero from '@/components/sections/hero';
import Benefits from '@/components/sections/benefits';


export default function Home() {  const { address, isConnected, connector, chain } = useAccount(); // Get connector info
  const router = useRouter();


  const hasLoggedConnection = useRef(false);

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard'); 

      // --- Log connection to backend API ---
      if (address && chain && connector && !hasLoggedConnection.current) {
        hasLoggedConnection.current = true; 
        const logConnection = async () => {
          try {
            const response = await fetch('/api/log-connection', {
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
              console.error('Failed to log connection to backend:', response.statusText);
            } else {
              const data = await response.json();
              console.log('Connection logged:', data);
            }
          } catch (error) {
            console.error('Error sending connection log:', error);
          }
        };
        logConnection();
      }
    } else {
      hasLoggedConnection.current = false;
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
      </main>
      <Footer />
    </div>
  );
}
