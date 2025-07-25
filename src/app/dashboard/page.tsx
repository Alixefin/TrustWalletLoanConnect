// app/dashboard/page.tsx
'use client'; // This page will also be a Client Component as it uses Wagmi hooks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi'; // Import useDisconnect

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button'; // Assuming your Button component

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { disconnect } = useDisconnect(); // Hook for disconnecting wallet

  // Effect to redirect back to home if disconnected
  useEffect(() => {
    if (!isConnected) {
      router.push('/'); // Redirect back to home if wallet is disconnected
    }
  }, [isConnected, router]);

  // Optionally, show a loading state or return null if not connected yet
  if (!isConnected) {
    return null; // Or a loading spinner, to prevent flashing disconnected state
  }

  return (
    <>
      <Header />
      <main className="container flex-grow py-12 md:py-24 lg:py-32">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary">
            Welcome to Trust Wallet Loan Connect
          </h1>
          <Button onClick={() => disconnect()} variant="destructive"> {/* Assuming you have a 'destructive' variant for danger actions */}
            Disconnect
          </Button>
        </div>

        <div className="mt-8">
          {/* Pick Loan Section - Placeholder */}
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
            {/* Add more loan options as needed */}
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}