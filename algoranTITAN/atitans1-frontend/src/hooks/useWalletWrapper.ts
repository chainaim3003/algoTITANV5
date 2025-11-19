/**
 * Wallet Wrapper Hook
 * Provides a consistent interface for wallet operations across the app
 * Wraps @txnlab/use-wallet-react to provide missing connect/disconnect/providers functions
 */
import { useWallet as useWalletOriginal } from '@txnlab/use-wallet-react';

export interface WalletProvider {
  metadata: {
    name: string;
    id: string;
  };
}

export function useWallet() {
  const { activeAddress, wallets, signTransactions, activeAccount } = useWalletOriginal();
  
  const connect = async (providerId?: string) => {
    const wallet = wallets?.find(w => w.id === providerId || (!providerId && !w.isActive));
    if (wallet) {
      await wallet.connect();
    } else if (wallets && wallets.length > 0) {
      // Fallback to first available wallet
      await wallets[0].connect();
    }
  };
  
  const disconnect = async () => {
    const activeWallet = wallets?.find(w => w.isActive);
    if (activeWallet) {
      await activeWallet.disconnect();
    }
  };
  
  const providers: WalletProvider[] = wallets?.map(w => ({
    metadata: {
      name: w.metadata?.name || w.id || 'Unknown',
      id: w.id
    }
  })) || [];
  
  return {
    activeAddress,
    activeAccount,
    wallets,
    signTransactions,
    connect,
    disconnect,
    providers
  };
}
