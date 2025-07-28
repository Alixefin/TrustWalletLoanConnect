
'use client'; 

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';


import { Button } from '@/components/ui/button'; 


import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';


export default function DashboardPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  // If disconnected, redirect back to the home page (login/connect page)
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Show a loading state or nothing while redirecting/connecting
  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow flex items-center justify-center text-center p-4">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-primary">Connected Successfully!</h1>
          <p className="text-lg text-muted-foreground">Your wallet is now linked.</p>
          <Button size="lg" onClick={() => alert('Choose Loan button clicked!')}> {/* Example action */}
            Choose Loan
          </Button>
          {/* Optional: Disconnect button on the dashboard */}
          {/* <Button variant="outline" className="ml-4" onClick={() => disconnect()}>Disconnect</Button> */}
        </div>
      </main>
      <Footer />
    </div>
  );
}