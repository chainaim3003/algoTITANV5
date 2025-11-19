import algosdk from 'algosdk';
import { algorandService } from './algorandService';

export type StorageOption = 'IPFS' | 'ALGORAND_BOX' | 'HYBRID';

export interface StorageResult {
  storageType: StorageOption;
  primaryHash: string;
  backupHash?: string;
  ipfsHash?: string;
  boxName?: string;
  metadataHash: string;
  storageUrl: string;
  estimatedCost: number; // in microAlgos
}

export interface DocumentData {
  blReference: string;
  documentType: string;
  content: any;
  metadata: {
    timestamp: string;
    version: string;
    parties: string[];
  };
}

export class AlgorandStorageService {
  
  // Calculate storage costs for different options
  static calculateStorageCosts(dataSize: number): {
    ipfs: number;
    algorandBox: number;
    hybrid: number;
  } {
    const ALGO_PER_BYTE = 2500; // microAlgos per byte for box storage
    const IPFS_COST_PER_MB = 100000; // estimated microAlgos per MB
    
    const sizeInMB = dataSize / (1024 * 1024);
    
    return {
      ipfs: Math.ceil(sizeInMB * IPFS_COST_PER_MB),
      algorandBox: dataSize * ALGO_PER_BYTE,
      hybrid: Math.ceil(sizeInMB * IPFS_COST_PER_MB) + (256 * ALGO_PER_BYTE), // IPFS + hash storage
    };
  }

  // Store document using IPFS
  static async storeOnIPFS(
    documentData: DocumentData,
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>,
    sender: string
  ): Promise<StorageResult> {
    try {
      // Simulate IPFS upload (in production, use Pinata or IPFS node)
      const jsonContent = JSON.stringify(documentData);
      const contentHash = this.generateHash(jsonContent);
      const ipfsHash = `Qm${this.generateIPFSHash(contentHash)}`;
      
      // Store IPFS hash on-chain via transaction note
      const suggestedParams = await algorandService.algodClient.getTransactionParams().do();
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: sender,
        amount: 1000, // 0.001 ALGO fee
        note: new TextEncoder().encode(`IPFS_STORAGE:${documentData.blReference}:${ipfsHash}`),
        suggestedParams,
      });

      const signedTxns = await signer([txn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await algorandService.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      await algosdk.waitForConfirmation(algorandService.algodClient, sendResult.txid, 4);

      return {
        storageType: 'IPFS',
        primaryHash: ipfsHash,
        ipfsHash,
        metadataHash: contentHash,
        storageUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        estimatedCost: 1000 + this.calculateStorageCosts(jsonContent.length).ipfs,
      };
    } catch (error) {
      throw new Error(`IPFS storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Store document using Algorand Box Storage
  static async storeOnAlgorandBox(
    documentData: DocumentData,
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>,
    sender: string,
    appId: number
  ): Promise<StorageResult> {
    try {
      const jsonContent = JSON.stringify(documentData);
      const contentHash = this.generateHash(jsonContent);
      const boxName = `BL_${documentData.blReference}_${Date.now()}`;
      
      if (jsonContent.length > 32 * 1024) {
        throw new Error('Document too large for Algorand Box Storage (max 32KB)');
      }

      // Create box storage transaction (simplified - in production use AlgoKit utils)
      const suggestedParams = await algorandService.algodClient.getTransactionParams().do();
      
      // Box creation cost
      const boxCost = (jsonContent.length + 400) * 2500; // microAlgos
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: algosdk.getApplicationAddress(appId),
        amount: boxCost,
        note: new TextEncoder().encode(`BOX_STORAGE:${boxName}:${contentHash}`),
        suggestedParams,
      });

      const signedTxns = await signer([txn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await algorandService.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      await algosdk.waitForConfirmation(algorandService.algodClient, sendResult.txid, 4);

      return {
        storageType: 'ALGORAND_BOX',
        primaryHash: contentHash,
        boxName,
        metadataHash: contentHash,
        storageUrl: `algorand://box/${appId}/${boxName}`,
        estimatedCost: boxCost,
      };
    } catch (error) {
      throw new Error(`Algorand Box storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Store document using Hybrid approach (IPFS + on-chain hash)
  static async storeHybrid(
    documentData: DocumentData,
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>,
    sender: string
  ): Promise<StorageResult> {
    try {
      const jsonContent = JSON.stringify(documentData);
      const contentHash = this.generateHash(jsonContent);
      const ipfsHash = `Qm${this.generateIPFSHash(contentHash)}`;
      
      // Store both IPFS hash and content hash on-chain
      const suggestedParams = await algorandService.algodClient.getTransactionParams().do();
      
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver: sender,
        amount: 2000, // 0.002 ALGO fee for hybrid storage
        note: new TextEncoder().encode(`HYBRID_STORAGE:${documentData.blReference}:${ipfsHash}:${contentHash}`),
        suggestedParams,
      });

      const signedTxns = await signer([txn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      const sendResult = await algorandService.algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      await algosdk.waitForConfirmation(algorandService.algodClient, sendResult.txid, 4);

      return {
        storageType: 'HYBRID',
        primaryHash: ipfsHash,
        backupHash: contentHash,
        ipfsHash,
        metadataHash: contentHash,
        storageUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        estimatedCost: 2000 + this.calculateStorageCosts(jsonContent.length).hybrid,
      };
    } catch (error) {
      throw new Error(`Hybrid storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Main storage method with option selection
  static async storeDocument(
    documentData: DocumentData,
    storageOption: StorageOption,
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>,
    sender: string,
    appId?: number
  ): Promise<StorageResult> {
    
    if (!algosdk.isValidAddress(sender)) {
      throw new Error('Invalid sender address');
    }

    switch (storageOption) {
      case 'IPFS':
        return this.storeOnIPFS(documentData, signer, sender);
      
      case 'ALGORAND_BOX':
        if (!appId) {
          throw new Error('App ID required for Algorand Box storage');
        }
        return this.storeOnAlgorandBox(documentData, signer, sender, appId);
      
      case 'HYBRID':
        return this.storeHybrid(documentData, signer, sender);
      
      default:
        throw new Error(`Unsupported storage option: ${storageOption}`);
    }
  }

  // Retrieve document based on storage type
  static async retrieveDocument(storageResult: StorageResult): Promise<DocumentData | null> {
    try {
      switch (storageResult.storageType) {
        case 'IPFS':
        case 'HYBRID':
          // In production, fetch from IPFS gateway
          if (storageResult.ipfsHash) {
            // Simulate IPFS retrieval
            console.log(`Retrieving from IPFS: ${storageResult.storageUrl}`);
            return null; // Would return actual document in production
          }
          break;
          
        case 'ALGORAND_BOX':
          // In production, retrieve from Algorand box storage
          if (storageResult.boxName) {
            console.log(`Retrieving from Algorand Box: ${storageResult.boxName}`);
            return null; // Would return actual document in production
          }
          break;
      }
      return null;
    } catch (error) {
      console.error('Document retrieval failed:', error);
      return null;
    }
  }

  // Verify document integrity
  static verifyDocumentIntegrity(
    document: DocumentData,
    expectedHash: string
  ): boolean {
    const actualHash = this.generateHash(JSON.stringify(document));
    return actualHash === expectedHash;
  }

  // Utility methods
  private static generateHash(content: string): string {
    // Simple hash generation (in production, use crypto-js or similar)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private static generateIPFSHash(contentHash: string): string {
    // Generate realistic IPFS hash format (46 characters after Qm)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = contentHash.slice(0, 8);
    for (let i = result.length; i < 46; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get storage option recommendations based on use case
  static getStorageRecommendations(documentSize: number, securityLevel: 'HIGH' | 'MEDIUM' | 'LOW'): {
    recommended: StorageOption;
    reasons: string[];
    alternatives: { option: StorageOption; pros: string[]; cons: string[] }[];
  } {
    const costs = this.calculateStorageCosts(documentSize);
    const sizeInKB = documentSize / 1024;
    
    // Always recommend Algorand Box first if size permits
    if (sizeInKB <= 32) {
      return {
        recommended: 'ALGORAND_BOX',
        reasons: [
          'Maximum security with native on-chain storage',
          'Direct smart contract integration',
          'No external dependencies or gateway risks',
          'Document size fits within Box storage limits'
        ],
        alternatives: [
          {
            option: 'HYBRID',
            pros: ['Lower cost than Box storage', 'On-chain verification'],
            cons: ['Depends on IPFS availability', 'More complex retrieval']
          },
          {
            option: 'IPFS',
            pros: ['Lowest cost', 'Industry standard'],
            cons: ['No on-chain verification', 'Gateway dependency']
          }
        ]
      };
    }
    
    // For documents too large for Box storage
    return {
      recommended: 'HYBRID',
      reasons: [
        'Document too large for Algorand Box Storage (>32KB)',
        'Hybrid provides best balance of security and cost',
        'On-chain hash ensures integrity verification'
      ],
      alternatives: [
        {
          option: 'IPFS',
          pros: ['Lower cost', 'Decentralized storage'],
          cons: ['No on-chain verification', 'Depends on IPFS gateway availability']
        }
      ]
    };
  }
}

export default AlgorandStorageService;
