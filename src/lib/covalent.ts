// src/lib/covalent.ts
import 'server-only'; // Ensure this file only runs on the server

const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const COVALENT_BASE_URL = 'https://api.covalenthq.com/v1';

if (!COVALENT_API_KEY) {
  console.error('COVALENT_API_KEY is not set. Covalent API calls will fail.');
}

export async function fetchCovalent(endpoint: string, params?: URLSearchParams) {
  const url = `${COVALENT_BASE_URL}${endpoint}?${params ? params.toString() + '&' : ''}key=${COVALENT_API_KEY}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Covalent API error for ${endpoint}: ${response.status} - ${errorText}`);
      throw new Error(`Covalent API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching from Covalent API for ${endpoint}:`, error);
    throw error;
  }
}

// Map chain IDs to Covalent chain names/IDs (approximate, adjust as needed)
// Covalent uses their own chain IDs, which might be different from common chain IDs.
// You'll need to look up the correct Covalent chain IDs for your specific networks.
// Example: Ethereum Mainnet is 1, Polygon Mainnet is 137, BNB Chain is 56, Solana is 'solana-mainnet'
// For this example, I'll use common chain IDs and assume Covalent handles it.
// In a real scenario, you'd verify Covalent's specific chain_id values.
export const CHAIN_ID_TO_COVALENT_NAME: { [key: number]: string } = {
  1: 'eth-mainnet',       // Ethereum
  56: 'bsc-mainnet',       // BNB Smart Chain
  137: 'polygon-mainnet',   // Polygon
  11155111: 'sepolia-testnet', // Sepolia
  // You might need to add other testnets or specific Covalent IDs here
};