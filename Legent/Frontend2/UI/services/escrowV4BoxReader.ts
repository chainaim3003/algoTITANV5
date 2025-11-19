/**
 * Escrow V4 Box Reader Service
 * 
 * Properly decodes ARC4-encoded box data from Escrow V4 contract
 */
import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getActiveEscrowContract } from '../config/contracts'

const { appId: ESCROW_APP_ID } = getActiveEscrowContract()

// Log which contract we're reading from
console.log('📦 EscrowBoxReader initialized with App ID:', ESCROW_APP_ID)

// Create Algod client
const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
)

const algorandClient = AlgorandClient.fromClients({ algod: algodClient })

export interface EscrowTrade {
  tradeId: number
  buyer: string
  seller: string
  escrowProvider: string
  amount: bigint
  state: number
  createdAt: bigint
  instrumentAssetId: bigint
  instrumentType: bigint
  instrumentValue: bigint
  regulatorWallet: string
  regulatorTaxPaid: bigint
  regulatorRefundDue: bigint
  marketplaceFee: bigint
}

export interface TradeMetadata {
  productType: string
  description: string
  ipfsHash: string
  leiId: string
  leiName: string
  instrumentNumber: string
}

export class EscrowV4BoxReader {
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
   * Get next trade ID from global state
   */
  async getNextTradeId(): Promise<number> {
    try {
      const appInfo = await algodClient.getApplicationByID(ESCROW_APP_ID).do()
      const globalState = appInfo.params.globalState || []

      for (const item of globalState) {
        const keyBytes = item.key instanceof Uint8Array ? item.key : Buffer.from(item.key as any, 'base64')
        const key = Buffer.from(keyBytes).toString()
        if (key === 'nextTradeId') {
          return Number(item.value.uint)
        }
      }

      return 1 // Default if not found
    } catch (error) {
      console.error('Error getting next trade ID:', error)
      return 1
    }
  }

  /**
   * Read and decode a trade from box storage
   */
  async getTrade(tradeId: number): Promise<EscrowTrade | null> {
    try {
      // FIXED: Use proper ARC4 encoding for box name
      const tradeIdEncoded = this.encodeUint64(tradeId);
      const boxName = this.createBoxName('trades', tradeIdEncoded);
      
      const boxValue = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, boxName).do()
      
      const data = Buffer.from(boxValue.value)
      
      // Decode ARC4 struct (TradeEscrow)
      // Format: [uint64, Address, Address, Address, uint64, uint64, uint64, uint64, uint64, uint64, Address, uint64, uint64, uint64]
      // NO tuple prefix - data starts directly with fields
      let offset = 0

      const tradeId_decoded = data.readBigUInt64BE(offset)
      offset += 8

      const buyer = algosdk.encodeAddress(data.subarray(offset, offset + 32))
      offset += 32

      const seller = algosdk.encodeAddress(data.subarray(offset, offset + 32))
      offset += 32

      const escrowProvider = algosdk.encodeAddress(data.subarray(offset, offset + 32))
      offset += 32

      const amount = data.readBigUInt64BE(offset)
      offset += 8

      const state = data.readBigUInt64BE(offset)
      offset += 8

      const createdAt = data.readBigUInt64BE(offset)
      offset += 8

      const instrumentAssetId = data.readBigUInt64BE(offset)
      offset += 8

      const instrumentType = data.readBigUInt64BE(offset)
      offset += 8

      const instrumentValue = data.readBigUInt64BE(offset)
      offset += 8

      const regulatorWallet = algosdk.encodeAddress(data.subarray(offset, offset + 32))
      offset += 32

      const regulatorTaxPaid = data.readBigUInt64BE(offset)
      offset += 8

      const regulatorRefundDue = data.readBigUInt64BE(offset)
      offset += 8

      const marketplaceFee = data.readBigUInt64BE(offset)
      offset += 8

      return {
        tradeId: Number(tradeId_decoded),
        buyer,
        seller,
        escrowProvider,
        amount,
        state: Number(state),
        createdAt,
        instrumentAssetId,
        instrumentType,
        instrumentValue,
        regulatorWallet,
        regulatorTaxPaid,
        regulatorRefundDue,
        marketplaceFee
      }
    } catch (error) {
      // Box doesn't exist or can't be decoded
      return null
    }
  }

  /**
   * Read and decode trade metadata from box storage
   */
  async getTradeMetadata(tradeId: number): Promise<TradeMetadata | null> {
    try {
      // FIXED: Use proper ARC4 encoding for box name
      const tradeIdEncoded = this.encodeUint64(tradeId);
      const boxName = this.createBoxName('metadata', tradeIdEncoded);
      
      const boxValue = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, boxName).do()
      
      const data = Buffer.from(boxValue.value)
      
      // Decode ARC4 struct (TradeMetadata)
      // WORKAROUND: The data has an anomaly where the first string is at byte 14 
      // but not in the offset table. We'll read it manually then use offsets for the rest.
      let offset = 0

      // Skip tuple header (2 bytes)
      offset += 2

      // Read 6 offsets (2 bytes each)
      const offsets: number[] = []
      for (let i = 0; i < 6; i++) {
        offsets.push(data.readUInt16BE(offset))
        offset += 2
      }

      // Now at byte 14 - read first string manually (productType)
      const productTypeLen = data.readUInt16BE(14)
      const productType = data.subarray(16, 16 + productTypeLen).toString('utf8')

      // Use offsets for remaining strings
      const readStringAt = (offsetValue: number): string => {
        if (offsetValue >= data.length) return ''
        const strLen = data.readUInt16BE(offsetValue)
        if (strLen === 0 || offsetValue + 2 + strLen > data.length) return ''
        return data.subarray(offsetValue + 2, offsetValue + 2 + strLen).toString('utf8')
      }

      const description = readStringAt(offsets[0]) // offset 0 -> "Food Description"
      const ipfsHash = readStringAt(offsets[1])    // offset 1 -> IPFS hash
      const leiId = readStringAt(offsets[2])       // offset 2 -> empty
      const leiName = readStringAt(offsets[3])     // offset 3 -> empty
      const instrumentNumber = readStringAt(offsets[4]) // offset 4 -> empty

      return {
        productType,
        description,
        ipfsHash,
        leiId,
        leiName,
        instrumentNumber
      }
    } catch (error) {
      // Box doesn't exist or can't be decoded
      return null
    }
  }

  /**
   * Get all trades
   */
  async getAllTrades(): Promise<Array<{ trade: EscrowTrade; metadata: TradeMetadata }>> {
    try {
      console.log('📡 Fetching all trades from App ID:', ESCROW_APP_ID)
      const nextTradeId = await this.getNextTradeId()
      console.log('📊 Next Trade ID:', nextTradeId)
      console.log(`🔍 Will scan for trades: 1 to ${nextTradeId - 1}`)
      
      const results: Array<{ trade: EscrowTrade; metadata: TradeMetadata }> = []

      for (let tradeId = 1; tradeId < nextTradeId; tradeId++) {
        console.log(`  Fetching trade #${tradeId}...`)
        const [trade, metadata] = await Promise.all([
          this.getTrade(tradeId),
          this.getTradeMetadata(tradeId)
        ])

        if (trade && metadata) {
          console.log(`  ✅ Trade #${tradeId} found`)
          results.push({ trade, metadata })
        } else {
          console.log(`  ⚠️ Trade #${tradeId} not found or incomplete`)
        }
      }

      console.log(`✅ Total trades loaded: ${results.length}`)
      return results
    } catch (error) {
      console.error('❌ Error getting all trades:', error)
      return []
    }
  }

  /**
   * Get trades by state
   */
  async getTradesByState(state: number): Promise<Array<{ trade: EscrowTrade; metadata: TradeMetadata }>> {
    const allTrades = await this.getAllTrades()
    return allTrades.filter(t => t.trade.state === state)
  }

  /**
   * Get trades by buyer
   */
  async getTradesByBuyer(buyerAddress: string): Promise<Array<{ trade: EscrowTrade; metadata: TradeMetadata }>> {
    const allTrades = await this.getAllTrades()
    return allTrades.filter(t => t.trade.buyer === buyerAddress)
  }

  /**
   * Get trades by seller
   */
  async getTradesBySeller(sellerAddress: string): Promise<Array<{ trade: EscrowTrade; metadata: TradeMetadata }>> {
    const allTrades = await this.getAllTrades()
    return allTrades.filter(t => t.trade.seller === sellerAddress)
  }
}

export const escrowV4BoxReader = new EscrowV4BoxReader()
