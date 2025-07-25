"use client"; 
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import Link from 'next/link';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Header() {

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="https://trustwallet.com/assets/images/media/assets/TWT.png" alt="Trust Wallet Logo" width={32} height={32} />
            <span className="font-bold inline-block text-primary">Trust Wallet Loan Connect</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Contact
            </Link>
          </nav>

          <div className="flex items-center">
            <ConnectButton />
          </div>
        </div>
      </header>
    </>
  );
}
