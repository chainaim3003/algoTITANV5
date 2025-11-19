/**
 * AtomicMarketplaceEscrowV4 Integration Service
 * 
 * Connects frontend to the deployed V4 Escrow contract on TestNet
 * Uses proper ABI method calling with CORRECT box references
 */
import algosdk from 'algosdk';
import { ABIMethod, ABIUintType, ABIStringType, ABIAddressType } from 'algosdk';
import { getActiveEscrowContract } from '../config/contracts';

// V5 Contract App ID from centralized config
const { appId: V5_ESCROW_APP_ID } = getActiveEscrowContract();

// TestNet Algod client
const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
);

export interface CreateTradeParams {
  sellerAddress: string;
  amount: number; // In microAlgos or microUSDC
  productType: string;
  description: string;
  ipfsHash: string;
  senderAddress: string;
  signer: any; // Use any to be compatible with both wallet signers
}

export interface TradeResult {
  tradeId: number;
  txId: string;
  explorerUrl: string;
  confirmedRound: number;
}

class EscrowV4Service {
  private appId = V5_ESCROW_APP_ID;

  // ABI method for createTrade
  private createTradeMethod = new ABIMethod({
    name: 'createTrade',
    args: [
      { type: 'address', name: 'sellerAddress' },
      { type: 'uint64', name: 'amount' },
      { type: 'string', name: 'productType' },
      { type: 'string', name: 'description' },
      { type: 'string', name: 'ipfsHash' }
    ],
    returns: { type: 'uint64' }
  });

  /**
   * Helper: Encode uint64 as 8-byte big-endian for box name
   */
  private encodeUint64(value: number): Uint8Array {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, BigInt(value), false);
    return bytes;
  }

  /**
   * Helper: Create box name for BoxMap with keyPrefix + encoded key
   */
  private createBoxName(prefix: string, key: Uint8Array): Uint8Array {
    const prefixBytes = new TextEncoder().encode(prefix);
    const result = new Uint8Array(prefixBytes.length + key.length);
    result.set(prefixBytes, 0);
    result.set(key, prefixBytes.length);
    return result;
  }

  /**
   * Create a trade listing in V4 Escrow using proper ABI encoding
   */
  async createTradeListing(params: CreateTradeParams): Promise<TradeResult> {
    console.log('📝 Creating trade in V4 Escrow contract:', {
      appId: this.appId,
      seller: params.sellerAddress,
      amount: params.amount,
      description: params.description
    });

    try {
      // Get suggested params
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Encode method arguments using ABI
      const methodArgs = [
        algosdk.decodeAddress(params.sellerAddress).publicKey,
        params.amount,
        params.productType,
        params.description,
        params.ipfsHash
      ];

      // Get method selector (first 4 bytes of SHA-512/256 hash of method signature)
      const methodSelector = this.createTradeMethod.getSelector();

      // Encode the arguments
      const encodedArgs = [methodSelector];
      
      // Manually encode each argument according to ARC4
      // Address - 32 bytes
      encodedArgs.push(algosdk.decodeAddress(params.sellerAddress).publicKey);
      
      // uint64 - 8 bytes big-endian
      const amountBytes = new Uint8Array(8);
      new DataView(amountBytes.buffer).setBigUint64(0, BigInt(params.amount), false);
      encodedArgs.push(amountBytes);
      
      // Strings - length prefix (2 bytes) + UTF-8 bytes
      const encodeString = (str: string) => {
        const strBytes = new TextEncoder().encode(str);
        const result = new Uint8Array(2 + strBytes.length);
        new DataView(result.buffer).setUint16(0, strBytes.length, false);
        result.set(strBytes, 2);
        return result;
      };
      
      encodedArgs.push(encodeString(params.productType));
      encodedArgs.push(encodeString(params.description));
      encodedArgs.push(encodeString(params.ipfsHash));

      // Get next trade ID to determine box names
      const nextTradeId = await this.getNextTradeId();
      
      // FIXED: Create properly encoded box names for BoxMap
      // BoxMap keys are: keyPrefix + ARC4-encoded(key)
      const tradeIdEncoded = this.encodeUint64(nextTradeId);
      const buyerAddress = algosdk.decodeAddress(params.senderAddress).publicKey;
      const sellerAddress = algosdk.decodeAddress(params.sellerAddress).publicKey;
      
      // Create app call transaction with CORRECT boxes
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.senderAddress,
        appIndex: this.appId,
        appArgs: encodedArgs,
        suggestedParams,
        boxes: [
          // trades box: prefix "trades" + 8-byte tradeId
          { appIndex: this.appId, name: this.createBoxName('trades', tradeIdEncoded) },
          // metadata box: prefix "metadata" + 8-byte tradeId
          { appIndex: this.appId, name: this.createBoxName('metadata', tradeIdEncoded) },
          // buyer box: prefix "buyer" + 32-byte address
          { appIndex: this.appId, name: this.createBoxName('buyer', buyerAddress) },
          // seller box: prefix "seller" + 32-byte address
          { appIndex: this.appId, name: this.createBoxName('seller', sellerAddress) }
        ]
      });

      // Sign transaction
      const signedTxns = await params.signer([algosdk.encodeUnsignedTransaction(appCallTxn)]);
      
      // Submit to network
      const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
      const txId = txResponse.txid;

      // Wait for confirmation
      const confirmation = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      // The return value should be in the logs
      const tradeId = nextTradeId; // Use the nextTradeId we calculated

      console.log('✅ Trade created successfully:', {
        tradeId,
        txId,
        confirmedRound: confirmation.confirmedRound
      });

      return {
        tradeId,
        txId,
        explorerUrl: `https://allo.info/tx/${txId}`,
        confirmedRound: Number(confirmation.confirmedRound) || 0,
      };
    } catch (error) {
      console.error('❌ Error creating trade:', error);
      throw new Error(`Failed to create trade: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get next trade ID from global state
   */
  async getNextTradeId(): Promise<number> {
    try {
      const appInfo = await algodClient.getApplicationByID(this.appId).do();
      const globalState = appInfo.params.globalState || [];
      
      for (const item of globalState) {
        const keyBytes = item.key instanceof Uint8Array ? item.key : Buffer.from(item.key as any);
        const key = Buffer.from(keyBytes).toString();
        if (key === 'nextTradeId') {
          return Number(item.value.uint);
        }
      }
      
      return 1; // Default if not found
    } catch (error) {
      console.error('Error getting next trade ID:', error);
      return 1;
    }
  }

  /**
   * Get contract global state
   */
  async getContractState(): Promise<{
    nextTradeId: number;
    settlementCurrency: number;
    platformTreasury: string;
  }> {
    try {
      const appInfo = await algodClient.getApplicationByID(this.appId).do();
      const globalState = appInfo.params.globalState || [];
      
      // Parse global state
      const state: any = {};
      globalState.forEach((item: any) => {
        const keyBytes = item.key instanceof Uint8Array ? item.key : Buffer.from(item.key as any);
        const key = Buffer.from(keyBytes).toString();
        state[key] = item.value;
      });

      return {
        nextTradeId: state.nextTradeId?.uint || 0,
        settlementCurrency: state.settlementCurrency?.uint || 0,
        platformTreasury: state.platformTreasury?.bytes || '',
      };
    } catch (error) {
      console.error('Error reading contract state:', error);
      throw error;
    }
  }

  /**
   * Check if contract is initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      const state = await this.getContractState();
      return state.nextTradeId > 0;
    } catch {
      return false;
    }
  }

  getAppId(): number {
    return this.appId;
  }
}

export const escrowV4Service = new EscrowV4Service();
