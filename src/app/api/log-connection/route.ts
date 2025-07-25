
import { NextResponse } from 'next/server';
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

// Global array to store logs (resets on server restart!)
const walletConnectionLogs: WalletConnectionLog[] = [];

// --- POST request handler for logging connections ---
export async function POST(request: Request) {
  try {
    const { walletAddress, connectedWalletName, chainId, chainName } = await request.json();

    // Basic validation
    if (!walletAddress || !connectedWalletName || !chainId || !chainName) {
      return NextResponse.json({ message: 'Missing required connection details' }, { status: 400 });
    }

    // Capture server-side data
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.url; // 'x-forwarded-for' is common from proxies like Vercel
    const userAgent = request.headers.get('user-agent');
    const domain = request.headers.get('origin') || request.headers.get('host');

    const newLog: WalletConnectionLog = {
      id: Math.random().toString(36).substring(2, 11), // Simple unique ID
      timestamp: new Date().toISOString(),
      walletAddress,
      connectedWalletName,
      chainId,
      chainName,
      ipAddress: ipAddress || 'N/A',
      domain: domain || 'N/A',
      userAgent: userAgent || 'N/A',
      ethBalance: 'Fetching...',
      tokens: [],
      nftsDetected: false,
      totalWalletValueUsd: 'Fetching...',
    };

    walletConnectionLogs.push(newLog);
    console.log('Logged new connection:', newLog);

    return NextResponse.json({ message: 'Connection logged successfully', id: newLog.id }, { status: 200 });

  } catch (error) {
    console.error('Error logging connection:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}


export async function GET() {
  return NextResponse.json(walletConnectionLogs, { status: 200 });
}