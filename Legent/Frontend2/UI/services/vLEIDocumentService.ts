/**
 * vLEI Document Service
 * 
 * PRIMARY: Uses Mock API (exact same structure as the file)
 * FALLBACK: File Picker (if user wants to select a different file)
 */

import { mockVLEIAPI } from './mockVLEIAPI'

export interface vLEIEndorsedPO {
  exchangedDocument?: any
  supplyChainTradeTransaction?: any
  endorsements?: any[]
  privacyMetadata?: any
  // Simplified fields for easy access
  purchaseOrder?: any
  vLEICredential?: any
  endorsement?: {
    timestamp: string
    issuer: string
    signature: string
  }
  metadata?: {
    documentType: string
    version: string
    encodedAt: string
  }
}

class VLEIDocumentService {
  /**
   * PRIMARY METHOD: Load vLEI from Mock API
   * ✅ Returns exact same structure as the file
   * ✅ No file picker needed
   * ✅ Instant loading
   * ✅ Product-type specific endorsements
   */
  async readVLEIEndorsedPO(productType: string = 'Food-Tea'): Promise<vLEIEndorsedPO | null> {
    try {
      console.log('📡 Loading vLEI endorsed PO from Mock API...')
      console.log(`🔄 Loading vLEI endorsement for: ${productType}`)
      
      // Load from mock API (same structure as file)
      const vLEIDoc = await mockVLEIAPI.getVLEIDocument(productType)
      
      console.log('✅ vLEI endorsed PO loaded from Mock API')
      console.log('📊 Document structure:', {
        hasExchangedDocument: !!vLEIDoc.exchangedDocument,
        hasSupplyChain: !!vLEIDoc.supplyChainTradeTransaction,
        hasEndorsements: !!vLEIDoc.endorsements,
        hasPurchaseOrder: !!vLEIDoc.purchaseOrder
      })
      
      return vLEIDoc as vLEIEndorsedPO
    } catch (error) {
      console.error('❌ Error loading from Mock API:', error)
      console.log('💡 Falling back to file picker...')
      return this.readVLEIWithFilePicker()
    }
  }

  /**
   * FALLBACK: Use file picker if user wants to select different file
   */
  async readVLEIWithFilePicker(): Promise<vLEIEndorsedPO | null> {
    try {
      console.log('📂 Opening file picker...')
      console.log('Navigate to: C:\\SATHYA\\CHAINAIM3003\\mcp-servers\\SATHYA-PAPERS\\PRET36Ref\\GLEIF\\AlgoTITANSV2-PREP')

      const file = await this.openFilePicker('.json', 'application/json')
      
      if (!file) {
        console.log('⚠️ No file selected')
        return null
      }

      console.log('📄 Reading file:', file.name)

      const content = await this.readFileAsText(file)
      const jsonData = JSON.parse(content)

      console.log('✅ File loaded successfully')
      
      return jsonData as vLEIEndorsedPO
    } catch (error) {
      console.error('❌ Error reading file:', error)
      return null
    }
  }

  /**
   * Open file picker
   */
  private openFilePicker(accept: string, mimeType: string): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      input.style.display = 'none'

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement
        const file = target.files?.[0]
        document.body.removeChild(input)
        resolve(file || null)
      }

      input.oncancel = () => {
        document.body.removeChild(input)
        resolve(null)
      }

      document.body.appendChild(input)
      input.click()
    })
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => resolve(event.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Validate vLEI document structure (flexible validation)
   */
  validateVLEIDocument(doc: any): boolean {
    if (!doc) {
      console.error('❌ Document is null or undefined')
      return false
    }
    
    // Check for either structure:
    // 1. Full UN/CEFACT structure (exchangedDocument + supplyChainTradeTransaction)
    // 2. Simplified structure (purchaseOrder)
    const hasFullStructure = doc.exchangedDocument && doc.supplyChainTradeTransaction
    const hasSimplifiedStructure = doc.purchaseOrder
    
    if (!hasFullStructure && !hasSimplifiedStructure) {
      console.error('❌ Invalid document structure - missing required fields')
      return false
    }
    
    console.log('✅ Document validation passed:', {
      hasExchangedDocument: !!doc.exchangedDocument,
      hasSupplyChain: !!doc.supplyChainTradeTransaction,
      hasEndorsements: !!doc.endorsements,
      hasPurchaseOrder: !!doc.purchaseOrder,
      hasVLEICredential: !!doc.vLEICredential
    })
    
    return true
  }

  /**
   * Convert vLEI document to string for storage
   */
  stringifyVLEIDocument(doc: vLEIEndorsedPO): string {
    return JSON.stringify(doc, null, 2)
  }

  /**
   * Get document hash (SHA-256)
   */
  async hashVLEIDocument(doc: vLEIEndorsedPO): Promise<string> {
    const docString = this.stringifyVLEIDocument(doc)
    const encoder = new TextEncoder()
    const data = encoder.encode(docString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  /**
   * Extract key information from vLEI document for display
   */
  extractDocumentSummary(doc: vLEIEndorsedPO): {
    poId: string
    buyer: string
    seller: string
    amount: number
    currency: string
    deliveryDate: string
  } | null {
    try {
      // Try simplified structure first
      if (doc.purchaseOrder) {
        return {
          poId: doc.purchaseOrder.id || 'N/A',
          buyer: doc.purchaseOrder.buyer || 'N/A',
          seller: doc.purchaseOrder.seller || 'N/A',
          amount: doc.purchaseOrder.amount || 0,
          currency: doc.purchaseOrder.currency || 'USD',
          deliveryDate: doc.purchaseOrder.deliveryDate || 'N/A'
        }
      }

      // Try full UN/CEFACT structure
      if (doc.exchangedDocument && doc.supplyChainTradeTransaction) {
        const agreement = doc.supplyChainTradeTransaction.applicableHeaderTradeAgreement
        const settlement = doc.supplyChainTradeTransaction.applicableHeaderTradeSettlement
        const delivery = doc.supplyChainTradeTransaction.applicableHeaderTradeDelivery

        return {
          poId: doc.exchangedDocument.id || 'N/A',
          buyer: agreement?.buyerTradeParty?.name || 'N/A',
          seller: agreement?.sellerTradeParty?.name || 'N/A',
          amount: settlement?.specifiedTradeSettlementHeaderMonetarySummation?.grandTotalAmount?.value || 0,
          currency: settlement?.invoiceCurrencyCode || 'USD',
          deliveryDate: delivery?.requestedDeliverySupplyChainEvent?.occurrenceDateTime?.dateTimeString?.value || 'N/A'
        }
      }

      return null
    } catch (error) {
      console.error('Error extracting document summary:', error)
      return null
    }
  }
}

export const vLEIDocumentService = new VLEIDocumentService()
