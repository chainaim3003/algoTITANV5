/**
 * Trade Document Storage Service
 * 
 * Handles storing trade-related documents in Algorand box storage
 */
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

const V4_ESCROW_APP_ID = 746780258

export interface TradeDocument {
  tradeId: number
  documentType: 'purchaseOrder' | 'vLEI' | 'billOfLading' | 'warehouseReceipt'
  content: string // JSON stringified
  hash: string
  timestamp: number
  uploadedBy: string
}

class TradeDocumentStorageService {
  private appId = V4_ESCROW_APP_ID
  private algorand: AlgorandClient

  constructor() {
    this.algorand = AlgorandClient.testNet()
  }

  /**
   * Create box name for trade document
   */
  private getDocumentBoxName(tradeId: number, documentType: string): Uint8Array {
    // Format: "doc_{tradeId}_{documentType}"
    const boxName = `doc_${tradeId}_${documentType}`
    return new Uint8Array(Buffer.from(boxName))
  }

  /**
   * Store document in box storage
   */
  async storeDocument(params: {
    tradeId: number
    documentType: TradeDocument['documentType']
    content: string
    hash: string
    senderAddress: string
    signer: any
  }): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      console.log('📦 Storing document in box storage:', {
        tradeId: params.tradeId,
        documentType: params.documentType,
        contentLength: params.content.length,
      })

      // Create the document object
      const document: TradeDocument = {
        tradeId: params.tradeId,
        documentType: params.documentType,
        content: params.content,
        hash: params.hash,
        timestamp: Date.now(),
        uploadedBy: params.senderAddress,
      }

      // Convert document to bytes for storage
      const documentBytes = new Uint8Array(Buffer.from(JSON.stringify(document)))

      // Get box name
      const boxName = this.getDocumentBoxName(params.tradeId, params.documentType)

      // Get suggested params
      const suggestedParams = await this.algorand.client.algod.getTransactionParams().do()

      // Calculate box MBR (Minimum Balance Requirement)
      // Box cost = 2500 + 400 * (box name size + box value size)
      const boxNameSize = boxName.length
      const boxValueSize = documentBytes.length
      const boxMBR = 2500 + 400 * (boxNameSize + boxValueSize)

      console.log('💰 Box storage cost:', {
        boxNameSize,
        boxValueSize,
        boxMBR: `${boxMBR} microAlgos`,
      })

      // Create payment transaction to fund the box
      const appAddress = algosdk.getApplicationAddress(this.appId)
      
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: params.senderAddress,
        receiver: appAddress,
        amount: boxMBR,
        suggestedParams,
      })

      // Create app call to store the box
      // Note: This is a placeholder - you'll need to add a method to your contract
      // to accept and store documents in boxes
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.senderAddress,
        appIndex: this.appId,
        appArgs: [
          new Uint8Array(Buffer.from('storeDocument')),
          new Uint8Array(Buffer.from(String(params.tradeId))),
          new Uint8Array(Buffer.from(params.documentType)),
        ],
        boxes: [
          {
            appIndex: this.appId,
            name: boxName,
          },
        ],
        suggestedParams,
      })

      // Group transactions
      const txns = [paymentTxn, appCallTxn]
      algosdk.assignGroupID(txns)

      // Sign transactions
      const signedTxns = await params.signer(
        txns.map((txn) => algosdk.encodeUnsignedTransaction(txn))
      )

      // Send transactions
      const response = await this.algorand.client.algod.sendRawTransaction(signedTxns).do()
      const txId = response.txid

      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algorand.client.algod, txId, 4)

      console.log('✅ Document stored successfully:', txId)

      return {
        success: true,
        txId,
      }
    } catch (error) {
      console.error('❌ Error storing document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Read document from box storage
   */
  async readDocument(
    tradeId: number,
    documentType: TradeDocument['documentType']
  ): Promise<TradeDocument | null> {
    try {
      console.log('📖 Reading document from box storage:', { tradeId, documentType })

      const boxName = this.getDocumentBoxName(tradeId, documentType)

      // Read box value
      const boxValue = await this.algorand.client.algod
        .getApplicationBoxByName(this.appId, boxName)
        .do()

      if (!boxValue || !boxValue.value) {
        console.log('⚠️ Document not found')
        return null
      }

      // Parse document
      const documentBytes = Buffer.from(boxValue.value)
      const document = JSON.parse(documentBytes.toString()) as TradeDocument

      console.log('✅ Document read successfully:', document)

      return document
    } catch (error) {
      console.error('❌ Error reading document:', error)
      return null
    }
  }

  /**
   * List all documents for a trade
   */
  async listTradeDocuments(tradeId: number): Promise<string[]> {
    try {
      // Get all boxes for the app
      const boxes = await this.algorand.client.algod.getApplicationBoxes(this.appId).do()

      // Filter boxes that belong to this trade
      const tradeBoxes = boxes.boxes
        .map((box: any) => Buffer.from(box.name).toString())
        .filter((name: string) => name.startsWith(`doc_${tradeId}_`))
        .map((name: string) => name.replace(`doc_${tradeId}_`, ''))

      console.log('📋 Documents for trade', tradeId, ':', tradeBoxes)

      return tradeBoxes
    } catch (error) {
      console.error('❌ Error listing documents:', error)
      return []
    }
  }

  /**
   * Store vLEI document specifically (convenience method)
   */
  async storeVLEIDocument(params: {
    tradeId: number
    vLEIContent: string
    hash: string
    senderAddress: string
    signer: any
  }) {
    return this.storeDocument({
      tradeId: params.tradeId,
      documentType: 'vLEI',
      content: params.vLEIContent,
      hash: params.hash,
      senderAddress: params.senderAddress,
      signer: params.signer,
    })
  }
}

export const tradeDocumentStorageService = new TradeDocumentStorageService()
