// components/layout/Hero.tsx
"use client"; // Keep this, as we'll use client-side hooks and components

// Import necessary components
import { Button } from "@/components/ui/button"; // Your custom button component
import { ConnectButton } from '@rainbow-me/rainbowkit'; // RainbowKit's ConnectButton
import { useAccount } from 'wagmi'; // Wagmi hook to check connection status
import Link from 'next/link'; // For client-side navigation if connected

export default function Hero() {
  const { isConnected } = useAccount(); // Check if a wallet is connected

  return (
    <>
      <section className="py-20 md:py-32 lg:py-40">
        <div className="container text-center px-4 sm:px-6 lg:px-8">
          {/* Restored the main heading and paragraph */}
          <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-primary">
            Decentralized Loans Powered by Trust
          </h1>
          <p className="mx-auto mt-6 max-w-[700px] text-lg text-muted-foreground md:text-xl">
            Welcome to Trust Wallet Loan Connect, your secure gateway to decentralized finance. Access loans without the hassle of traditional banking.
          </p>

          <div className="mt-8">
            {/* Conditional rendering for the button based on connection status */}
            {isConnected ? (
              // If connected, show a button to go to the dashboard
              <Button size="lg" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              // If not connected, use RainbowKit's custom connect button
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain; // Check for actual connection

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {/*
                        We ensure that the "Get Started" text is only shown when disconnected.
                        If connected, it will implicitly hide this button if `isConnected` above
                        is true. This `ConnectButton.Custom` is primarily for the *disconnected* state.
                      */}
                      {(() => {
                        if (!connected) { // Only render if not connected
                          return (
                            <Button size="lg" onClick={openConnectModal}>
                              Get Started {/* Original button text */}
                            </Button>
                          );
                        }
                        // Optionally, return null or a different component if already connected
                        return null; // Don't render this button if already connected
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            )}
          </div>
        </div>
      </section>
      {/* WalletConnectModal and related state are completely removed as RainbowKit handles it */}
    </>
  );
}