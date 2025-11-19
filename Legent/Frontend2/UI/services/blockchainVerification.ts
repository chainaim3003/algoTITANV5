import { algorandService } from './algorandService';
import algosdk from 'algosdk';

export class BlockchainVerificationService {
  
  // Verify all addresses are real Algorand addresses
  static validateAddress(address: string): boolean {
    return algosdk.isValidAddress(address);
  }
  
  // Verify transaction ID format (52 characters, base32)
  static validateTransactionId(txId: string): boolean {
    return txId.length === 52 && /^[A-Z2-7]+$/.test(txId);
  }
  
  // Test blockchain connectivity
  static async testBlockchainConnection(): Promise<{
    connected: boolean;
    network: string;
    server: string;
    lastRound?: number;
    error?: string;
  }> {
    try {
      const networkInfo = algorandService.getNetworkInfo();
      const status = await algorandService.algodClient.status().do();
      
      return {
        connected: true,
        network: networkInfo.network,
        server: networkInfo.server,
        lastRound: Number(status.lastRound),
      };
    } catch (error) {
      return {
        connected: false,
        network: 'unknown',
        server: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Verify account exists on blockchain
  static async verifyAccountExists(address: string): Promise<{
    exists: boolean;
    balance?: number;
    error?: string;
  }> {
    if (!this.validateAddress(address)) {
      return {
        exists: false,
        error: 'Invalid Algorand address format',
      };
    }
    
    try {
      const balance = await algorandService.getAccountBalance(address);
      return {
        exists: true,
        balance,
      };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Account verification failed',
      };
    }
  }
  
  // Verify transaction exists on blockchain
  static async verifyTransactionExists(txId: string): Promise<{
    exists: boolean;
    confirmedRound?: number;
    error?: string;
  }> {
    if (!this.validateTransactionId(txId)) {
      return {
        exists: false,
        error: 'Invalid transaction ID format',
      };
    }
    
    try {
      const txInfo = await algorandService.getTransactionInfo(txId);
      return {
        exists: true,
        confirmedRound: txInfo['confirmed-round'] || txInfo.confirmedRound,
      };
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Transaction verification failed',
      };
    }
  }
  
  // Generate proper explorer URL for verification
  static getExplorerUrl(txId: string): string | null {
    if (!this.validateTransactionId(txId)) {
      return null;
    }
    
    const networkInfo = algorandService.getNetworkInfo();
    
    switch (networkInfo.network) {
      case 'mainnet':
        return `https://allo.info/tx/${txId}`;
      case 'testnet':
        return `https://testnet.algoexplorer.io/tx/${txId}`;
      case 'localnet':
        return `http://localhost:8980/v2/transactions/${txId}`;
      default:
        return `https://testnet.algoexplorer.io/tx/${txId}`;
    }
  }
  
  // Check if running on LocalNet (requires local node)
  static async isLocalNetRunning(): Promise<boolean> {
    try {
      const networkInfo = algorandService.getNetworkInfo();
      return networkInfo.network === 'localnet' && 
             networkInfo.server.includes('localhost');
    } catch {
      return false;
    }
  }
}

export default BlockchainVerificationService;
