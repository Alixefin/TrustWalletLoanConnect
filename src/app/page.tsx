'use client'; // This page needs to be a Client Component

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // For client-side redirects
import { useAccount } from 'wagmi'; // To check connection status

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Hero from '@/components/sections/hero';
import Benefits from '@/components/sections/benefits';


export default function Home() {
const { isConnected } = useAccount();
  const router = useRouter();

  // Effect to redirect if connected
  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard'); // Redirect to dashboard page
    }
  }, [isConnected, router]); // Dependency array: re-run when isConnected or router changes

  // Only render the Hero content if not connected
  if (isConnected) {
    return null; // Don't render anything from the home page if redirecting
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
