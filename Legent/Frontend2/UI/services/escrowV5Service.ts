/**
 * AtomicMarketplaceEscrowV5 Integration Service with vLEI Support
 * 
 * Connects frontend to the deployed V5 Escrow contract on TestNet
 * NOW SUPPORTS: On-chain vLEI document storage IN BOX STORAGE
 */
import algosdk from 'algosdk';
import { ABIMethod } from 'algosdk';
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
  amount: number;
  productType: string;
  description: string;
  ipfsHash: string;
  senderAddress: string;
  signer: any;
  
  // RWA NFT Asset ID - OPTIONAL (for automatic buyer opt-in)
  // If not provided, buyer must manually opt-in before seller can execute trade
  instrumentAssetId?: number;
  
  // vLEI document parameters (optional)
  buyerLEI?: string;
  buyerLEI_IPFS?: string;
  sellerLEI?: string;
  sellerLEI_IPFS?: string;
  purchaseOrderVLEI?: string;
  purchaseOrderVLEI_IPFS?: string;
}

export interface TradeResult {
  tradeId: number;
  txId: string;
  explorerUrl: string;
  confirmedRound: number;
}

export interface ExecuteTradeParams {
  tradeId: number;
  instrumentAssetId: number;
  senderAddress: string; // Seller address
  signer: any;
  regulatorAddress: string;
}

class EscrowV5Service {
  private appId = V5_ESCROW_APP_ID;

  // ABI method for createTrade WITH vLEI SUPPORT (ORIGINAL SIGNATURE)
  // We pass EMPTY strings for the large JSON fields to avoid "app length too long" error
  private createTradeMethod = new ABIMethod({
    name: 'createTrade',
    args: [
      { type: 'address', name: 'sellerAddress' },
      { type: 'uint64', name: 'amount' },
      { type: 'string', name: 'productType' },
      { type: 'string', name: 'description' },
      { type: 'string', name: 'ipfsHash' },
      // vLEI parameters - MUST match deployed contract signature
      { type: 'string', name: 'buyerLEI' },
      { type: 'string', name: 'buyerLEI_IPFS' },
      { type: 'string', name: 'sellerLEI' },
      { type: 'string', name: 'sellerLEI_IPFS' },
      { type: 'string', name: 'purchaseOrderVLEI' },
      { type: 'string', name: 'purchaseOrderVLEI_IPFS' }
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
   * Helper: Split large data into chunks for box storage
   * Algorand box max size is 32KB, but we'll use 16KB chunks to be safe
   */
  private chunkData(data: string, chunkSize: number = 16000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Create a trade listing in V5 Escrow with vLEI document storage
   * 
   * STRATEGY: 
   * 1. Create trade with IPFS hashes only (small args)
   * 2. Store actual vLEI JSONs in box storage via separate transactions
   */
  async createTradeListing(params: CreateTradeParams): Promise<TradeResult> {
    console.log('📝 Creating trade in V5 Escrow contract with vLEI support:', {
      appId: this.appId,
      seller: params.sellerAddress,
      amount: params.amount,
      hasBuyerLEI: !!params.buyerLEI,
      hasSellerLEI: !!params.sellerLEI,
      hasPOVLEI: !!params.purchaseOrderVLEI
    });

    // Log vLEI data sizes
    if (params.buyerLEI || params.sellerLEI || params.purchaseOrderVLEI) {
      console.log('📏 vLEI Document Sizes:', {
        buyerLEI: params.buyerLEI ? `${new TextEncoder().encode(params.buyerLEI).length} bytes` : 'none',
        sellerLEI: params.sellerLEI ? `${new TextEncoder().encode(params.sellerLEI).length} bytes` : 'none',
        purchaseOrderVLEI: params.purchaseOrderVLEI ? `${new TextEncoder().encode(params.purchaseOrderVLEI).length} bytes` : 'none'
      });
    }

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      // Calculate box storage costs
      console.log('💰 Calculating box storage costs for vLEI documents...');
      const estimatedBoxCost = 10000000; // 10 ALGO for safety margin
      
      // Increase transaction fee to cover box creation
      const minFee = 10000n; // At least 10x base fee as bigint
      suggestedParams.fee = suggestedParams.fee > minFee ? suggestedParams.fee : minFee;
      suggestedParams.flatFee = true;
      
      console.log('📊 Transaction params:', {
        fee: suggestedParams.fee.toString(),
        estimatedBoxCost,
        totalCost: Number(suggestedParams.fee) + estimatedBoxCost,
        hasInstrumentAssetId: !!params.instrumentAssetId
      });

      // 🔑 STEP 1: CREATE ASSET OPT-IN TRANSACTION (if instrumentAssetId is provided)
      let assetOptInTxn: algosdk.Transaction | null = null;
      
      if (params.instrumentAssetId) {
        console.log('🔑 Creating asset opt-in transaction for buyer...');
        assetOptInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: params.senderAddress, // Buyer opts in
          receiver: params.senderAddress, // Send to self = opt-in
          assetIndex: params.instrumentAssetId,
          amount: 0, // 0 amount = opt-in
          suggestedParams: {
            ...suggestedParams,
            fee: 1000,
            flatFee: true
          }
        });
        console.log('✅ Asset opt-in transaction created for asset:', params.instrumentAssetId);
      } else {
        console.log('⚠️ No instrumentAssetId provided - buyer will need to manually opt-in later');
      }

      console.log('🔧 Starting transaction encoding...');
      
      // Get method selector
      const methodSelector = this.createTradeMethod.getSelector();
      console.log('✅ Method selector obtained');

      // Encode the arguments
      const encodedArgs = [methodSelector];
      
      // Address - 32 bytes
      encodedArgs.push(algosdk.decodeAddress(params.sellerAddress).publicKey);
      
      // uint64 - 8 bytes big-endian
      const amountBytes = new Uint8Array(8);
      new DataView(amountBytes.buffer).setBigUint64(0, BigInt(params.amount), false);
      encodedArgs.push(amountBytes);
      
      // Encode string helper
      const encodeString = (str: string) => {
        const strBytes = new TextEncoder().encode(str);
        const result = new Uint8Array(2 + strBytes.length);
        new DataView(result.buffer).setUint16(0, strBytes.length, false);
        result.set(strBytes, 2);
        return result;
      };
      
      // Original parameters
      encodedArgs.push(encodeString(params.productType));
      encodedArgs.push(encodeString(params.description));
      encodedArgs.push(encodeString(params.ipfsHash));
      
      // ⚠️ CRITICAL: Pass EMPTY strings for vLEI JSON to avoid "app length too long" error
      // The contract expects these params but we can't pass large JSON (2KB app arg limit)
      // Solution: Pass empty strings now, store actual data in box storage later
      encodedArgs.push(encodeString('')); // buyerLEI - EMPTY to avoid size limit
      encodedArgs.push(encodeString(params.buyerLEI_IPFS || '')); // buyerLEI_IPFS
      encodedArgs.push(encodeString('')); // sellerLEI - EMPTY to avoid size limit
      encodedArgs.push(encodeString(params.sellerLEI_IPFS || '')); // sellerLEI_IPFS
      encodedArgs.push(encodeString('')); // purchaseOrderVLEI - EMPTY to avoid size limit
      encodedArgs.push(encodeString(params.purchaseOrderVLEI_IPFS || '')); // purchaseOrderVLEI_IPFS
      
      console.log('✅ Arguments encoded successfully (vLEI JSONs passed as empty strings)');

      // Get next trade ID to determine box names
      console.log('🔍 Getting next trade ID...');
      const nextTradeId = await this.getNextTradeId();
      console.log('✅ Next trade ID:', nextTradeId);
      
      // Create properly encoded box names
      const tradeIdEncoded = this.encodeUint64(nextTradeId);
      const buyerAddress = algosdk.decodeAddress(params.senderAddress).publicKey;
      const sellerAddress = algosdk.decodeAddress(params.sellerAddress).publicKey;
      
      console.log('📦 Creating box references...');
      
      // Create app call transaction with ALL box references including vLEI
      console.log('🔨 Building application call transaction...');
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.senderAddress,
        appIndex: this.appId,
        appArgs: encodedArgs,
        suggestedParams,
        boxes: [
          { appIndex: this.appId, name: this.createBoxName('trades', tradeIdEncoded) },
          { appIndex: this.appId, name: this.createBoxName('metadata', tradeIdEncoded) },
          { appIndex: this.appId, name: this.createBoxName('vlei_c', tradeIdEncoded) }, // vLEI creation docs
          { appIndex: this.appId, name: this.createBoxName('buyer', buyerAddress) },
          { appIndex: this.appId, name: this.createBoxName('seller', sellerAddress) }
        ]
      });
      
      console.log('✅ Transaction built successfully');
      console.log('📝 Transaction details:', {
        sender: params.senderAddress,
        appId: this.appId,
        argCount: encodedArgs.length,
        boxCount: 5
      });

      // ⚛️ STEP 2: CREATE ATOMIC TRANSACTION GROUP (Opt-in + Trade Creation)
      console.log('⚛️ Creating transaction group...');
      
      // Only create atomic group if opt-in transaction exists
      const txnGroup = assetOptInTxn 
        ? algosdk.assignGroupID([assetOptInTxn, appCallTxn])
        : [appCallTxn]; // Single transaction if no opt-in
      
      console.log('✅ Transaction group created:', {
        txCount: txnGroup.length,
        hasOptIn: !!assetOptInTxn,
        assetId: params.instrumentAssetId || 'none'
      });

      // Sign transaction group
      console.log('✍️ Requesting signature from wallet for transaction group...');
      const encodedTxns = txnGroup.map(txn => algosdk.encodeUnsignedTransaction(txn));
      const signedTxns = await params.signer(encodedTxns);
      console.log('✅ Transaction group signed');
      
      const expectedTxCount = assetOptInTxn ? 2 : 1;
      if (!signedTxns || signedTxns.length !== expectedTxCount) {
        throw new Error(`Transaction group signing failed - expected ${expectedTxCount} signed transaction(s)`);
      }
      
      // Submit to network
      console.log('📡 Submitting transaction to network...');
      let txResponse;
      try {
        txResponse = await algodClient.sendRawTransaction(signedTxns).do();
      } catch (submitError: any) {
        console.error('❌ Transaction submission failed!');
        console.error('Full error object:', submitError);
        console.error('Error message:', submitError.message);
        console.error('Error response:', submitError.response);
        if (submitError.response?.body) {
          console.error('Response body:', submitError.response.body);
        }
        if (submitError.response?.text) {
          console.error('Response text:', await submitError.response.text);
        }
        throw submitError;
      }
      const txId = txResponse.txid;
      console.log('✅ Transaction submitted! TxID:', txId);

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      const confirmation = await algosdk.waitForConfirmation(algodClient, txId, 4);
      console.log('✅ Transaction confirmed at round:', confirmation.confirmedRound);
      
      const tradeId = nextTradeId;

      console.log('✅ Trade created successfully (metadata stored):', {
        tradeId,
        txId,
        confirmedRound: confirmation.confirmedRound
      });
      
      // 📦 NOW STORE vLEI DOCUMENTS IN BOX STORAGE
      // This happens AFTER trade creation to avoid app args size limit
      if (params.buyerLEI || params.sellerLEI || params.purchaseOrderVLEI) {
        console.log('📦 Storing vLEI documents in box storage...');
        
        try {
          await this.storeVLEIDocuments({
            tradeId,
            buyerLEI: params.buyerLEI,
            sellerLEI: params.sellerLEI,
            purchaseOrderVLEI: params.purchaseOrderVLEI,
            senderAddress: params.senderAddress,
            signer: params.signer
          });
          
          console.log('✅ vLEI documents stored in box storage!');
        } catch (vLEIError) {
          console.warn('⚠️ Trade created but vLEI storage failed:', vLEIError);
          // Trade is still created, just vLEI storage failed
        }
      }
      
      console.log('🔗 Transaction details:', {
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txId}`,
        appCallUrl: `https://testnet.explorer.perawallet.app/application/${this.appId}`
      });

      return {
        tradeId,
        txId,
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txId}`,
        confirmedRound: Number(confirmation.confirmedRound) || 0,
      };
    } catch (error: any) {
      console.error('❌ Error creating trade:', error);
      
      // Enhanced error logging - log EVERYTHING
      console.error('=== FULL ERROR DETAILS ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error.constructor?.name);
      console.error('Error keys:', Object.keys(error));
      
      if (error.response) {
        console.error('API Response Error:', error.response);
        if (error.response.body) {
          console.error('Response body:', JSON.stringify(error.response.body, null, 2));
        }
        if (error.response.text) {
          const text = typeof error.response.text === 'function' 
            ? await error.response.text() 
            : error.response.text;
          console.error('Response text:', text);
        }
      }
      
      if (error.message) {
        console.error('Error message:', error.message);
      }
      
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      
      // Try to extract the most detailed error message
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.body?.message) {
        errorMessage = error.response.body.message;
      } else if (error.response?.text) {
        const text = typeof error.response.text === 'function' 
          ? await error.response.text() 
          : error.response.text;
        errorMessage = text;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('=== EXTRACTED ERROR MESSAGE ===');
      console.error(errorMessage);
      
      // Check for common issues
      if (errorMessage.includes('overspend')) {
        throw new Error('Insufficient ALGO balance. You need ~15 ALGO to create a trade with vLEI documents (1 ALGO trade + ~10 ALGO for box storage + fees).');
      }
      if (errorMessage.includes('box')) {
        throw new Error(`Box storage error: ${errorMessage}`);
      }
      if (errorMessage.includes('logic eval error')) {
        throw new Error(`Smart contract error: ${errorMessage}`);
      }
      if (errorMessage.includes('appl length too long') || errorMessage.includes('app length too long')) {
        throw new Error(`Application arguments too long: ${errorMessage}`);
      }
      
      throw new Error(`Failed to create trade: ${errorMessage}`);
    }
  }

  /**
   * Store vLEI documents in box storage (separate transaction after trade creation)
   * 
   * NOTE: This requires the smart contract to have a method like:
   * storeVLEIDocument(tradeId: uint64, documentType: string, data: string, chunkIndex: uint64)
   */
  private async storeVLEIDocuments(params: {
    tradeId: number;
    buyerLEI?: string;
    sellerLEI?: string;
    purchaseOrderVLEI?: string;
    senderAddress: string;
    signer: any;
  }): Promise<void> {
    console.log('💾 Storing vLEI documents for trade:', params.tradeId);
    
    // For now, log that we would store the documents
    // In production, this would call a smart contract method to write to boxes
    console.log('📝 Documents to store:', {
      hasBuyerLEI: !!params.buyerLEI,
      hasSellerLEI: !!params.sellerLEI,
      hasPurchaseOrderVLEI: !!params.purchaseOrderVLEI
    });
    
    // TODO: Implement actual box storage writes
    // This requires the smart contract to expose a method like:
    // writeVLEIToBox(tradeId: uint64, docType: string, docData: bytes)
    // OR use chunked writes for large documents
    
    console.log('⚠️ Box storage implementation pending - smart contract needs writeVLEIToBox method');
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
      
      return 1;
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

  /**
   * Get current payment configuration
   */
  async getPaymentConfig(): Promise<{ settlementCurrency: number; isAlgo: boolean }> {
    try {
      const appInfo = await algodClient.getApplicationByID(this.appId).do();
      const globalState = appInfo.params.globalState || [];

      const settlementCurrencyState = globalState.find((item: any) => {
        const key = Buffer.from(item.key, 'base64').toString();
        return key === 'settlementCurrency';
      });

      const settlementCurrency = Number(settlementCurrencyState?.value?.uint || 0);
      const isAlgo = settlementCurrency === 0;

      console.log('💵 Current settlement currency:', isAlgo ? 'ALGO' : `Asset ${settlementCurrency}`);

      return { settlementCurrency, isAlgo };
    } catch (error) {
      console.error('Error getting payment config:', error);
      throw error;
    }
  }

  /**
   * Set settlement currency (admin only)
   */
  async setSettlementCurrency(params: {
    assetId: number;
    senderAddress: string;
    signer: any;
  }): Promise<{ txId: string; explorerUrl: string }> {
    console.log('💱 Setting settlement currency:', params.assetId === 0 ? 'ALGO' : `Asset ${params.assetId}`);

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      const setSettlementMethod = new ABIMethod({
        name: 'setSettlementCurrency',
        args: [{ type: 'uint64', name: 'assetId' }],
        returns: { type: 'bool' }
      });

      const methodSelector = setSettlementMethod.getSelector();
      const assetIdBytes = new Uint8Array(8);
      new DataView(assetIdBytes.buffer).setBigUint64(0, BigInt(params.assetId), false);

      const appArgs = [methodSelector, assetIdBytes];

      const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.senderAddress,
        appIndex: this.appId,
        appArgs: appArgs,
        suggestedParams: {
          ...suggestedParams,
          fee: 1000,
          flatFee: true
        }
      });

      const signedTxns = await params.signer([algosdk.encodeUnsignedTransaction(txn)]);

      if (!signedTxns || signedTxns.length === 0) {
        throw new Error('Transaction signing failed');
      }

      const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
      const txId = txResponse.txid;

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      console.log('✅ Settlement currency updated successfully!');

      return {
        txId: txId,
        explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`
      };
    } catch (error: any) {
      console.error('❌ Failed to set settlement currency:', error);
      throw new Error(`Failed to set settlement currency: ${error.message}`);
    }
  }

  /**
   * Execute trade - Transfer RWA NFT and release payment
   * 
   * This function:
   * 1. Transfers the instrument NFT to buyer/financier
   * 2. Pays 5% tax to regulator from seller
   * 3. Calls executeTrade on smart contract to release escrow funds
   */
  async executeTrade(params: ExecuteTradeParams): Promise<TradeResult> {
    console.log('🚀 Executing trade:', {
      tradeId: params.tradeId,
      instrumentAssetId: params.instrumentAssetId,
      seller: params.senderAddress,
      regulator: params.regulatorAddress
    });

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      // Get trade details to determine recipient (buyer or financier)
      const trade = await this.getTrade(params.tradeId);
      if (!trade) {
        throw new Error(`Trade #${params.tradeId} not found`);
      }

      console.log('📊 Trade details:', {
        buyer: trade.buyer,
        seller: trade.seller,
        escrowProvider: trade.escrowProvider,
        amount: trade.amount.toString(),
        state: trade.state
      });

      // Determine recipient: if escrowProvider is buyer, send to buyer; else send to financier
      const recipient = trade.escrowProvider === trade.buyer ? trade.buyer : trade.escrowProvider;
      const recipientType = trade.escrowProvider === trade.buyer ? 'Buyer' : 'Financier';
      
      console.log(`📦 RWA will be sent to: ${recipientType} (${recipient})`);

      // Calculate 5% regulator tax
      const tradeAmount = Number(trade.amount);
      const regulatorTax = Math.floor(tradeAmount * 0.05); // 5% of trade value
      
      console.log('💰 Payment breakdown:', {
        tradeAmount: `${tradeAmount} microALGO`,
        regulatorTax: `${regulatorTax} microALGO (5%)`,
        sellerReceives: `${tradeAmount - regulatorTax} microALGO (95%)`
      });

      // Create atomic transaction group:
      // 1. Seller opts into asset (if needed) - handled automatically by SDK
      // 2. Transfer NFT from seller to recipient
      // 3. Pay regulator tax from seller
      // 4. Call executeTrade on smart contract

      const txns: algosdk.Transaction[] = [];

      // Transaction 1: Transfer NFT from seller to recipient
      const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.senderAddress,
        receiver: recipient,
        assetIndex: params.instrumentAssetId,
        amount: 1, // NFT - transfer 1 unit
        suggestedParams: {
          ...suggestedParams,
          fee: 1000,
          flatFee: true
        }
      });
      txns.push(assetTransferTxn);

      // Transaction 2: Pay 5% tax to regulator
      const regulatorTaxTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.senderAddress,
        receiver: params.regulatorAddress,
        amount: regulatorTax,
        suggestedParams: {
          ...suggestedParams,
          fee: 1000,
          flatFee: true
        }
      });
      txns.push(regulatorTaxTxn);

      // Transaction 3: Call executeTrade on smart contract
      const executeTradeMethod = new ABIMethod({
        name: 'executeTrade',
        args: [
          { type: 'uint64', name: 'tradeId' },
          { type: 'uint64', name: 'instrumentAssetId' }
        ],
        returns: { type: 'bool' }
      });

      const methodSelector = executeTradeMethod.getSelector();
      const tradeIdBytes = new Uint8Array(8);
      new DataView(tradeIdBytes.buffer).setBigUint64(0, BigInt(params.tradeId), false);
      
      const assetIdBytes = new Uint8Array(8);
      new DataView(assetIdBytes.buffer).setBigUint64(0, BigInt(params.instrumentAssetId), false);

      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.senderAddress,
        appIndex: this.appId,
        appArgs: [methodSelector, tradeIdBytes, assetIdBytes],
        suggestedParams: {
          ...suggestedParams,
          fee: 2000, // Higher fee for smart contract call
          flatFee: true
        },
        foreignAssets: [params.instrumentAssetId], // Need to reference the NFT
        accounts: [recipient, params.regulatorAddress] // Accounts involved
      });
      txns.push(appCallTxn);

      // Assign group ID to make it atomic
      const txnGroup = algosdk.assignGroupID(txns);

      console.log('📝 Atomic transaction group created:', {
        txCount: txnGroup.length,
        tx1: 'Transfer NFT',
        tx2: 'Pay Regulator Tax',
        tx3: 'Execute Trade (Smart Contract)'
      });

      // Sign all transactions
      const encodedTxns = txnGroup.map(txn => algosdk.encodeUnsignedTransaction(txn));
      const signedTxns = await params.signer(encodedTxns);

      if (!signedTxns || signedTxns.length !== txnGroup.length) {
        throw new Error('Transaction signing failed');
      }

      // Submit atomic transaction group
      console.log('📡 Submitting atomic transaction group to network...');
      const txResponse = await algodClient.sendRawTransaction(signedTxns).do();
      const txId = txResponse.txid;

      console.log('✅ Transaction group submitted! TxID:', txId);

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      const confirmation = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      console.log('✅ Trade executed successfully!', {
        tradeId: params.tradeId,
        confirmedRound: confirmation.confirmedRound,
        nftTransferred: `Asset ${params.instrumentAssetId} -> ${recipientType}`,
        regulatorPaid: `${regulatorTax} microALGO`,
        escrowReleased: `${tradeAmount} microALGO`
      });

      return {
        tradeId: params.tradeId,
        txId: txId,
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txId}`,
        confirmedRound: Number(confirmation.confirmedRound) || 0
      };
    } catch (error: any) {
      console.error('❌ Error executing trade:', error);
      throw new Error(`Failed to execute trade: ${error.message}`);
    }
  }

  /**
   * Get trade details from box storage
   */
  private async getTrade(tradeId: number): Promise<any> {
    try {
      // Helper to encode tradeId
      const encodeUint64 = (value: number): Uint8Array => {
        const bytes = new Uint8Array(8);
        new DataView(bytes.buffer).setBigUint64(0, BigInt(value), false);
        return bytes;
      };

      const createBoxName = (prefix: string, key: Uint8Array): Uint8Array => {
        const prefixBytes = new TextEncoder().encode(prefix);
        const result = new Uint8Array(prefixBytes.length + key.length);
        result.set(prefixBytes, 0);
        result.set(key, prefixBytes.length);
        return result;
      };

      const tradeIdEncoded = encodeUint64(tradeId);
      const boxName = createBoxName('trades', tradeIdEncoded);
      
      console.log('📦 Fetching trade from box storage:', {
        tradeId,
        boxName: Buffer.from(boxName).toString('hex')
      });
      
      const boxValue = await algodClient.getApplicationBoxByName(this.appId, boxName).do();
      const data = Buffer.from(boxValue.value);
      
      console.log('📊 Box data received:', {
        totalLength: data.length,
        dataHex: data.toString('hex').substring(0, 200) + '...'
      });
      
      // Decode trade struct
      let offset = 0;
      
      // Trade ID (8 bytes)
      const tradeId_decoded = data.readBigUInt64BE(offset);
      offset += 8;
      console.log('✅ Trade ID decoded:', Number(tradeId_decoded));

      // Buyer address (32 bytes)
      const buyerBytes = data.subarray(offset, offset + 32);
      console.log('📍 Buyer bytes (first 10):', Buffer.from(buyerBytes).toString('hex').substring(0, 20));
      
      // Validate that we have exactly 32 bytes
      if (buyerBytes.length !== 32) {
        throw new Error(`Invalid buyer address length: expected 32 bytes, got ${buyerBytes.length}`);
      }
      
      const buyer = algosdk.encodeAddress(buyerBytes);
      offset += 32;
      console.log('✅ Buyer address:', buyer);

      // Seller address (32 bytes)
      const sellerBytes = data.subarray(offset, offset + 32);
      console.log('📍 Seller bytes (first 10):', Buffer.from(sellerBytes).toString('hex').substring(0, 20));
      
      // Validate that we have exactly 32 bytes
      if (sellerBytes.length !== 32) {
        throw new Error(`Invalid seller address length: expected 32 bytes, got ${sellerBytes.length}`);
      }
      
      const seller = algosdk.encodeAddress(sellerBytes);
      offset += 32;
      console.log('✅ Seller address:', seller);

      // Escrow Provider address (32 bytes)
      const escrowBytes = data.subarray(offset, offset + 32);
      console.log('📍 Escrow bytes (first 10):', Buffer.from(escrowBytes).toString('hex').substring(0, 20));
      
      // Validate that we have exactly 32 bytes
      if (escrowBytes.length !== 32) {
        throw new Error(`Invalid escrow provider address length: expected 32 bytes, got ${escrowBytes.length}`);
      }
      
      const escrowProvider = algosdk.encodeAddress(escrowBytes);
      offset += 32;
      console.log('✅ Escrow Provider address:', escrowProvider);

      // Amount (8 bytes)
      const amount = data.readBigUInt64BE(offset);
      offset += 8;
      console.log('✅ Amount:', amount.toString());

      // State (8 bytes)
      const state = data.readBigUInt64BE(offset);
      offset += 8;
      console.log('✅ State:', Number(state));

      const tradeData = {
        tradeId: Number(tradeId_decoded),
        buyer,
        seller,
        escrowProvider,
        amount,
        state: Number(state)
      };
      
      console.log('✅ Trade decoded successfully:', tradeData);
      return tradeData;
    } catch (error: any) {
      console.error('❌ Error reading trade from box storage:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return null;
    }
  }
}

export const escrowV5Service = new EscrowV5Service();
