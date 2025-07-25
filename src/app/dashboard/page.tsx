// app/dashboard/page.tsx
'use client';

import { useEffect, useRef } from 'react'; // Import useRef
import { useRouter } from 'next/navigation';
import { useAccount, useBalance, useDisconnect } from 'wagmi';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { address, isConnected, chain, connector } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const hasLoggedConnection = useRef(false); // Ref for logging

  useEffect(() => {
    if (!isConnected) {
      router.push('/'); // Redirect back to home if wallet is disconnected
    } else {
      // --- Log connection to your backend API from dashboard if it hasn't been logged yet ---
      // This handles cases where a user might directly land on dashboard and connect.
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
              console.error('Failed to log connection to backend from dashboard:', response.statusText);
            } else {
              const data = await response.json();
              console.log('Connection logged from dashboard:', data);
            }
          } catch (error) {
            console.error('Error sending connection log from dashboard:', error);
          }
        };
        logConnection();
      }
    }
  }, [address, isConnected, chain, connector, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="container flex-grow py-12 md:py-24 lg:py-32">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl text-primary mb-4 md:mb-0">
            Welcome to Trust Wallet Loan Connect
          </h1>
          <Button onClick={() => disconnect()} variant="destructive">
            Disconnect
          </Button>
        </div>

        <div className="mt-8">
          <h2 className="text-3xl font-bold text-secondary-foreground mb-4">Pick Your Loan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Example Loan Card 1 */}
            <div className="bg-card p-6 rounded-lg shadow-md border">
              <h3 className="text-xl font-semibold mb-2">Crypto-Backed Loan</h3>
              <p className="text-muted-foreground mb-4">Secure a loan using your crypto assets as collateral.</p>
              <Button>Apply Now</Button>
            </div>
            {/* Example Loan Card 2 */}
            <div className="bg-card p-6 rounded-lg shadow-md border">
              <h3 className="text-xl font-semibold mb-2">Flash Loan</h3>
              <p className="text-muted-foreground mb-4">Leverage uncollateralized loans for arbitrage opportunities.</p>
              <Button>Learn More</Button>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}