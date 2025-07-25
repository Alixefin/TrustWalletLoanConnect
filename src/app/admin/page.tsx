// app/admin/page.tsx
'use client'; // This page needs to be a Client Component to use Wagmi hooks and useRouter

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // For client-side redirects
import { useAccount, useBalance, useDisconnect } from 'wagmi'; // Wagmi hooks

import Header from '@/components/layout/header'; // Your Header component
import Footer from '@/components/layout/footer'; // Your Footer component
import { Button } from '@/components/ui/button'; // Your Button component

export default function AdminPanelPage() {
  const { address, isConnected, chain } = useAccount(); // Get connected address, status, and chain info
  const { data: balance } = useBalance({ address }); // Get balance for the connected address
  const { disconnect } = useDisconnect(); // Hook for disconnecting wallet
  const router = useRouter();

  // --- Protection Logic: Redirect if not connected ---
  useEffect(() => {
    if (!isConnected) {
      // If no wallet is connected, redirect to the home page
      router.push('/');
    }
  }, [isConnected, router]); // Re-run this effect if connection status or router changes

  // Show a loading state or nothing while redirecting
  if (!isConnected) {
    return null; // Or a loading spinner/message, to prevent flashing content
  }

  // --- Render Admin Panel Content if Connected ---
  return (
    <>
      <Header />
      <main className="container flex-grow py-12 md:py-24 lg:py-32">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl text-primary mb-4 md:mb-0">
            Admin Panel
          </h1>
          <Button onClick={() => disconnect()} variant="destructive">
            Disconnect
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-md border">
          <h2 className="text-2xl font-semibold mb-4 text-secondary-foreground">Connected Account Details</h2>
          <div className="space-y-2">
            <p>
              <strong>Wallet Address:</strong>{' '}
              <span className="font-mono text-sm break-all">{address}</span>
            </p>
            {chain && (
              <p>
                <strong>Connected Chain:</strong> {chain.name} (ID: {chain.id})
              </p>
            )}
            {balance && (
              <p>
                <strong>Balance:</strong> {balance.formatted} {balance.symbol}
              </p>
            )}
            {/* Add more account details as needed */}
          </div>
        </div>

        {/* You can add more admin panel features here */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4 text-secondary-foreground">Admin Actions (Coming Soon)</h2>
          <p className="text-muted-foreground">
            
          {/* Example:
          <Button className="mt-4">Manage Loans</Button>
          <Button className="mt-4 ml-4">View User Data</Button>
          */}
        </div>
      </main>
      <Footer />
    </>
  );
}