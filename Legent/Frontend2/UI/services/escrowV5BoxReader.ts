/**
 * Service to read vLEI documents from Escrow V5 box storage
 * 
 * This service reads vLEI compliance documents stored on-chain in Algorand boxes
 */
import algosdk from 'algosdk';
import { getActiveEscrowContract } from '../config/contracts';

const { appId: V5_ESCROW_APP_ID } = getActiveEscrowContract();

const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
);

export interface VLEICreationDocuments {
  buyerLEI: string;
  buyerLEI_IPFS: string;
  sellerLEI: string;
  sellerLEI_IPFS: string;
  purchaseOrderVLEI: string;
  purchaseOrderVLEI_IPFS: string;
  timestamp: number;
  tradeId: number;
}

export interface VLEIExecutionDocuments {
  shippingInstructionVLEI: string;
  shippingInstructionVLEI_IPFS: string;
  commercialInvoiceVLEI: string;
  commercialInvoiceVLEI_IPFS: string;
  rwaInstrumentLEI: string;
  rwaInstrumentLEI_IPFS: string;
  shippingInstructionId: string;
  commercialInvoiceId: string;
  timestamp: number;
  tradeId: number;
}

class EscrowV5BoxReader {
  private appId = V5_ESCROW_APP_ID;

  /**
   * Read vLEI creation documents (buyer/seller LEI, PO vLEI)
   */
  async getVLEICreationDocuments(tradeId: number): Promise<VLEICreationDocuments | null> {
    try {
      console.log(`📋 Reading vLEI creation documents for trade ${tradeId}...`);
      
      // Create box name: 'vlei_c' + tradeId
      const boxName = this.createBoxName('vlei_c', tradeId);
      
      // Read box
      const boxResponse = await algodClient
        .getApplicationBoxByName(this.appId, boxName)
        .do();
      
      // Decode the box value
      const decoded = this.decodeCreationDocuments(boxResponse.value);
      
      console.log('✅ vLEI creation documents retrieved');
      
      return {
        ...decoded,
        tradeId
      };
    } catch (error) {
      console.log(`ℹ️  No vLEI creation documents found for trade ${tradeId}`);
      return null;
    }
  }

  /**
   * Read vLEI execution documents (shipping, invoice, RWA LEI)
   */
  async getVLEIExecutionDocuments(tradeId: number): Promise<VLEIExecutionDocuments | null> {
    try {
      console.log(`📋 Reading vLEI execution documents for trade ${tradeId}...`);
      
      const boxName = this.createBoxName('vlei_e', tradeId);
      const boxResponse = await algodClient
        .getApplicationBoxByName(this.appId, boxName)
        .do();
      
      const decoded = this.decodeExecutionDocuments(boxResponse.value);
      
      console.log('✅ vLEI execution documents retrieved');
      
      return {
        ...decoded,
        tradeId
      };
    } catch (error) {
      console.log(`ℹ️  No vLEI execution documents found for trade ${tradeId}`);
      return null;
    }
  }

  /**
   * Helper: Create box name
   */
  private createBoxName(prefix: string, tradeId: number): Uint8Array {
    const prefixBytes = new TextEncoder().encode(prefix);
    const idBytes = new Uint8Array(8);
    new DataView(idBytes.buffer).setBigUint64(0, BigInt(tradeId), false);
    
    const result = new Uint8Array(prefixBytes.length + idBytes.length);
    result.set(prefixBytes, 0);
    result.set(idBytes, prefixBytes.length);
    return result;
  }

  /**
   * Helper: Decode creation documents from ABI encoding
   * 
   * Note: This is a simplified decoder. In production, use proper ABI codec.
   */
  private decodeCreationDocuments(boxValue: Uint8Array): Omit<VLEICreationDocuments, 'tradeId'> {
    try {
      // Try to decode as JSON first (simplified approach)
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(boxValue);
      const parsed = JSON.parse(jsonStr);
      
      return {
        buyerLEI: parsed.buyerLEI || '',
        buyerLEI_IPFS: parsed.buyerLEI_IPFS || '',
        sellerLEI: parsed.sellerLEI || '',
        sellerLEI_IPFS: parsed.sellerLEI_IPFS || '',
        purchaseOrderVLEI: parsed.purchaseOrderVLEI || '',
        purchaseOrderVLEI_IPFS: parsed.purchaseOrderVLEI_IPFS || '',
        timestamp: parsed.timestamp || 0
      };
    } catch {
      // Fallback: return empty structure
      return {
        buyerLEI: '',
        buyerLEI_IPFS: '',
        sellerLEI: '',
        sellerLEI_IPFS: '',
        purchaseOrderVLEI: '',
        purchaseOrderVLEI_IPFS: '',
        timestamp: 0
      };
    }
  }

  /**
   * Helper: Decode execution documents from ABI encoding
   */
  private decodeExecutionDocuments(boxValue: Uint8Array): Omit<VLEIExecutionDocuments, 'tradeId'> {
    try {
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(boxValue);
      const parsed = JSON.parse(jsonStr);
      
      return {
        shippingInstructionVLEI: parsed.shippingInstructionVLEI || '',
        shippingInstructionVLEI_IPFS: parsed.shippingInstructionVLEI_IPFS || '',
        commercialInvoiceVLEI: parsed.commercialInvoiceVLEI || '',
        commercialInvoiceVLEI_IPFS: parsed.commercialInvoiceVLEI_IPFS || '',
        rwaInstrumentLEI: parsed.rwaInstrumentLEI || '',
        rwaInstrumentLEI_IPFS: parsed.rwaInstrumentLEI_IPFS || '',
        shippingInstructionId: parsed.shippingInstructionId || '',
        commercialInvoiceId: parsed.commercialInvoiceId || '',
        timestamp: parsed.timestamp || 0
      };
    } catch {
      return {
        shippingInstructionVLEI: '',
        shippingInstructionVLEI_IPFS: '',
        commercialInvoiceVLEI: '',
        commercialInvoiceVLEI_IPFS: '',
        rwaInstrumentLEI: '',
        rwaInstrumentLEI_IPFS: '',
        shippingInstructionId: '',
        commercialInvoiceId: '',
        timestamp: 0
      };
    }
  }

  /**
   * Check if vLEI creation documents exist for a trade
   */
  async hasVLEICreationDocuments(tradeId: number): Promise<boolean> {
    const docs = await this.getVLEICreationDocuments(tradeId);
    return docs !== null && (!!docs.buyerLEI || !!docs.sellerLEI || !!docs.purchaseOrderVLEI);
  }

  /**
   * Check if vLEI execution documents exist for a trade
   */
  async hasVLEIExecutionDocuments(tradeId: number): Promise<boolean> {
    const docs = await this.getVLEIExecutionDocuments(tradeId);
    return docs !== null && (!!docs.shippingInstructionVLEI || !!docs.commercialInvoiceVLEI || !!docs.rwaInstrumentLEI);
  }
}

export const escrowV5BoxReader = new EscrowV5BoxReader();
