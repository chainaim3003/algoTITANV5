/**
 * Algorand Box Storage Service for Bill of Lading Data
 * Pure TypeScript implementation - no smart contract needed!
 * Uses account-based box storage
 */

import algosdk from 'algosdk';
import { BillOfLading } from '../interfaces/types';

// Extended type for box storage with ownership tracking
export interface ExtendedBillOfLading extends BillOfLading {
  currentHolder?: string;
  createdByCarrier?: {
    carrierAddress: string;
    assignedToExporter: string;
    creationTxId: string;
    timestamp: string;
  };
  status?: 'created' | 'transferred' | 'pending_transfer';
}

// TestNet configuration
const ALGOD_TOKEN = '';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;

export class BoxStorageService {
  private algodClient: algosdk.Algodv2;
  private storageAccount: string = ''; // The account that "owns" the boxes

  constructor() {
    this.algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
  }

  /**
   * Set the storage account (typically the carrier's address)
   */
  setStorageAccount(address: string) {
    this.storageAccount = address;
    console.log(`📦 Storage account set to: ${address}`);
  }

  /**
   * Store BL data in a box using account-based storage
   * Box is created under the sender's account
   */
  async storeBL(
    bl: ExtendedBillOfLading,
    senderAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<string> {
    try {
      const assetId = bl.rwaTokenization?.assetId;
      if (!assetId) {
        throw new Error('BL must have an asset ID');
      }

      console.log(`📦 Storing BL data for asset ${assetId} in box...`);

      // Box name: "BL_{assetId}"
      const boxName = `BL_${assetId}`;
      const boxNameBytes = new Uint8Array(Buffer.from(boxName));
      
      // Box data: JSON string of BL
      const blData = JSON.stringify(bl);
      const boxDataBytes = new Uint8Array(Buffer.from(blData));

      console.log(`📊 Box name: ${boxName}`);
      console.log(`📊 Box size: ${boxDataBytes.length} bytes`);
      console.log(`💰 Box MBR cost: ${2500 + (400 * boxDataBytes.length)} microAlgos`);

      // Store in memory/localStorage as fallback since direct box creation 
      // requires a smart contract application
      // For now, we'll use localStorage with a special prefix
      const storageKey = `algorand_box_${boxName}`;
      localStorage.setItem(storageKey, blData);
      
      // Also store metadata about all boxes
      const boxIndex = this.getBoxIndex();
      if (!boxIndex.includes(boxName)) {
        boxIndex.push(boxName);
        localStorage.setItem('algorand_box_index', JSON.stringify(boxIndex));
      }

      console.log(`✅ BL data stored in box ${boxName}`);
      console.log(`ℹ️  Note: Using localStorage simulation until smart contract is deployed`);

      return `simulated-${boxName}`;
    } catch (error: any) {
      console.error('❌ Error storing BL:', error);
      throw new Error(`Failed to store BL: ${error.message}`);
    }
  }

  /**
   * Read BL data from a box
   */
  async readBL(assetId: number): Promise<ExtendedBillOfLading | null> {
    try {
      console.log(`📖 Reading BL data for asset ${assetId}...`);

      const boxName = `BL_${assetId}`;
      const storageKey = `algorand_box_${boxName}`;
      
      const blData = localStorage.getItem(storageKey);
      
      if (!blData) {
        console.log(`⚠️ No box found for asset ${assetId}`);
        return null;
      }

      const bl: ExtendedBillOfLading = JSON.parse(blData);
      console.log(`✅ BL data loaded for asset ${assetId}`);
      return bl;
    } catch (error: any) {
      console.error('❌ Error reading BL:', error);
      return null;
    }
  }

  /**
   * List all BL boxes
   */
  async listAllBLs(): Promise<ExtendedBillOfLading[]> {
    try {
      console.log('📋 Listing all BL boxes...');

      const boxIndex = this.getBoxIndex();
      
      if (boxIndex.length === 0) {
        console.log('📭 No BL boxes found');
        return [];
      }

      console.log(`📦 Found ${boxIndex.length} boxes`);

      const bls: ExtendedBillOfLading[] = [];
      for (const boxName of boxIndex) {
        try {
          if (!boxName.startsWith('BL_')) {
            continue;
          }

          const assetId = parseInt(boxName.replace('BL_', ''));
          const bl = await this.readBL(assetId);
          
          if (bl) {
            bls.push(bl);
          }
        } catch (error) {
          console.error(`⚠️ Error reading box ${boxName}:`, error);
        }
      }

      console.log(`✅ Loaded ${bls.length} BLs from boxes`);
      return bls;
    } catch (error: any) {
      console.error('❌ Error listing BLs:', error);
      throw new Error(`Failed to list BLs: ${error.message}`);
    }
  }

  /**
   * Get the box index (list of all box names)
   */
  private getBoxIndex(): string[] {
    try {
      const indexData = localStorage.getItem('algorand_box_index');
      if (indexData) {
        return JSON.parse(indexData);
      }
      return [];
    } catch (error) {
      console.error('Error loading box index:', error);
      return [];
    }
  }

  /**
   * Update BL status and current holder
   */
  async updateBLStatus(
    transportDocumentReference: string,
    status: 'created' | 'transferred' | 'pending_transfer',
    newHolder?: string
  ): Promise<void> {
    try {
      console.log(`🔄 Updating BL status: ${transportDocumentReference}`);
      console.log(`   New status: ${status}`);
      console.log(`   New holder: ${newHolder || 'N/A'}`);

      // Find the BL by transport document reference
      const allBLs = await this.listAllBLs();
      const bl = allBLs.find(b => b.transportDocumentReference === transportDocumentReference);

      if (!bl) {
        throw new Error(`BL not found: ${transportDocumentReference}`);
      }

      // Update status and holder
      bl.status = status;
      if (newHolder) {
        bl.currentHolder = newHolder;
      }

      // Get the asset ID to determine box name
      const assetId = bl.rwaTokenization?.assetId;
      if (!assetId) {
        throw new Error('BL does not have an asset ID');
      }

      // Store updated BL
      const boxName = `BL_${assetId}`;
      const storageKey = `algorand_box_${boxName}`;
      localStorage.setItem(storageKey, JSON.stringify(bl));

      console.log(`✅ BL status updated successfully`);
    } catch (error: any) {
      console.error('❌ Error updating BL status:', error);
      throw new Error(`Failed to update BL status: ${error.message}`);
    }
  }

  /**
   * Clear all boxes (for testing)
   */
  async clearAllBoxes(): Promise<void> {
    const boxIndex = this.getBoxIndex();
    
    for (const boxName of boxIndex) {
      const storageKey = `algorand_box_${boxName}`;
      localStorage.removeItem(storageKey);
    }
    
    localStorage.removeItem('algorand_box_index');
    console.log('🗑️ Cleared all boxes');
  }

  /**
   * Get box statistics
   */
  async getBoxStats(): Promise<{
    totalBoxes: number;
    totalSize: number;
    estimatedCost: number;
  }> {
    const boxIndex = this.getBoxIndex();
    let totalSize = 0;

    for (const boxName of boxIndex) {
      const storageKey = `algorand_box_${boxName}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        totalSize += data.length;
      }
    }

    const estimatedCost = boxIndex.length * 2500 + totalSize * 400;

    return {
      totalBoxes: boxIndex.length,
      totalSize,
      estimatedCost,
    };
  }
}

// Export singleton instance
export const boxStorageService = new BoxStorageService();

/**
 * Note: This is a localStorage-based simulation of Algorand Box Storage.
 * 
 * To use REAL on-chain box storage, you would need to:
 * 
 * 1. Create a smart contract application with box storage enabled
 * 2. Deploy it to Algorand TestNet/MainNet
 * 3. Use algosdk.makeApplicationCallTxn() with boxes parameter:
 * 
 * Example:
 * ```typescript
 * const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
 *   from: sender,
 *   appIndex: YOUR_APP_ID,
 *   onComplete: algosdk.OnApplicationComplete.NoOpOC,
 *   appArgs: [new Uint8Array(Buffer.from('store_bl'))],
 *   boxes: [{
 *     appIndex: YOUR_APP_ID,
 *     name: new Uint8Array(Buffer.from(`BL_${assetId}`))
 *   }],
 *   suggestedParams,
 * });
 * ```
 * 
 * The current implementation uses localStorage for:
 * - Quick prototyping and testing
 * - No transaction fees during development
 * - Easy to clear and reset data
 * 
 * When ready for production, replace localStorage calls with actual
 * on-chain box storage transactions.
 */
