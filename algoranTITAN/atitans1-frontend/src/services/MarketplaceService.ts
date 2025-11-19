/**
 * Marketplace Service
 * 
 * Handles all marketplace operations: listing, buying, browsing
 */
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { TradeInstrumentRegistryClient } from '../contracts/TradeInstrumentRegistryClient'
import { AtomicMarketplaceV3Client } from '../contracts/AtomicMarketplaceV3Client'
import algosdk from 'algosdk'
import { getErrorMessage } from '../utils/errorHandling'
import {
  TradeInstrument,
  InstrumentListing,
  InstrumentSale,
  ListInstrumentRequest,
  ListInstrumentResponse,
  PurchaseWithAlgoRequest,
  PurchaseWithUSDCRequest,
  PurchaseResponse,
  Currency
} from '../types/v3-contract-types'

export class MarketplaceService {
  private signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  
  constructor(
    private algorand: AlgorandClient,
    private registryClient: TradeInstrumentRegistryClient,
    private marketplaceClient: AtomicMarketplaceV3Client,
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>
  ) {
    this.signer = signer;
  }

  /**
   * List instrument for sale on marketplace
   */
  async listInstrumentForSale(request: ListInstrumentRequest): Promise<ListInstrumentResponse> {
    try {
      // Convert validity days to seconds
      const validityPeriod = request.validityDays * 24 * 60 * 60

      // Determine listing type (fixed price for now)
      const listingType = 1 // Fixed price

      // Call marketplace contract to list instrument
      // Handle both bigint and number types for prices
      const priceAlgo = typeof request.priceAlgo === 'bigint' 
        ? request.priceAlgo 
        : BigInt(Math.floor((Number(request.priceAlgo) || 0) * 1e6));
      const priceUSDC = typeof request.priceUSDC === 'bigint'
        ? request.priceUSDC
        : BigInt(Math.floor((Number(request.priceUSDC) || 0) * 1e6));
      
      const result = await this.marketplaceClient.listInstrument({
        instrumentId: request.instrumentAssetId,
        askPriceAlgo: priceAlgo,
        askPriceUSDC: priceUSDC,
        validityPeriod: BigInt(validityPeriod),
        listingType: BigInt(listingType),
        signer: this.signer
      })

      return {
        listingId: BigInt(result.return || 0),
        txnId: result.txnId || ''
      }
    } catch (error) {
      console.error('Failed to list instrument:', getErrorMessage(error))
      throw new Error(`Failed to list instrument: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Purchase instrument with ALGO
   */
  async purchaseWithAlgo(request: PurchaseWithAlgoRequest): Promise<PurchaseResponse> {
    try {
      // Create payment transaction using algosdk directly
      const suggestedParams = await this.algorand.client.algod.getTransactionParams().do()
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: request.buyerAddress,
        receiver: this.marketplaceClient.appAddress,
        amount: Number(request.paymentAmount),
        note: new Uint8Array(Buffer.from(`Purchase listing ${request.listingId}`)),
        suggestedParams
      })

      // Call marketplace contract to purchase
      const result = await this.marketplaceClient.purchaseWithAlgo({
        listingId: request.listingId,
        payment: paymentTxn,
        signer: this.signer
      })

      // Get listing details to return instrument asset ID
      const listing = await this.getListing(request.listingId)

      return {
        saleId: BigInt(0), // Would be returned from contract in real implementation
        txnId: result.txnId || '',
        instrumentAssetId: listing.instrumentId
      }
    } catch (error) {
      console.error('Failed to purchase with ALGO:', getErrorMessage(error))
      throw new Error(`Failed to purchase with ALGO: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Purchase instrument with USDC
   */
  async purchaseWithUSDC(request: PurchaseWithUSDCRequest): Promise<PurchaseResponse> {
    try {
      // Get USDC asset ID from config
      const usdcAssetId = 31566704 // This should come from config

      // Create USDC transfer transaction using algosdk directly
      const suggestedParams = await this.algorand.client.algod.getTransactionParams().do()
      const usdcTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: request.buyerAddress,
        receiver: this.marketplaceClient.appAddress,
        assetIndex: usdcAssetId,
        amount: Number(request.paymentAmount),
        note: new Uint8Array(Buffer.from(`Purchase listing ${request.listingId} with USDC`)),
        suggestedParams
      })

      // Call marketplace contract to purchase
      const result = await this.marketplaceClient.purchaseWithUSDC({
        listingId: request.listingId,
        usdcTransfer: usdcTransferTxn,
        signer: this.signer
      })

      // Get listing details to return instrument asset ID
      const listing = await this.getListing(request.listingId)

      return {
        saleId: BigInt(0), // Would be returned from contract in real implementation
        txnId: result.txnId || '',
        instrumentAssetId: listing.instrumentId
      }
    } catch (error) {
      console.error('Failed to purchase with USDC:', getErrorMessage(error))
      throw new Error(`Failed to purchase with USDC: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Get all active marketplace listings
   */
  async getMarketplaceListings(): Promise<InstrumentListing[]> {
    try {
      // In a real implementation, this would query the marketplace contract
      // for all active listings. For now, return mock data or implement
      // based on actual contract structure.
      
      // This is a placeholder - actual implementation would need to:
      // 1. Get total number of listings from contract global state
      // 2. Iterate through listing IDs and fetch active ones
      // 3. Return array of active listings
      
      return []
    } catch (error) {
      console.error('Failed to get marketplace listings:', getErrorMessage(error))
      throw new Error(`Failed to get marketplace listings: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Get recent sales
   */
  async getRecentSales(limit: number = 10): Promise<InstrumentSale[]> {
    try {
      // Placeholder implementation
      // Would query marketplace contract for recent sales
      return []
    } catch (error) {
      console.error('Failed to get recent sales:', getErrorMessage(error))
      throw new Error(`Failed to get recent sales: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Get specific listing details
   */
  async getListing(listingId: bigint): Promise<InstrumentListing> {
    try {
      const result = await this.marketplaceClient.getListing({
        listingId
      })

      // Convert contract response to interface
      return {
        listingId: result.listingId || 0n,
        instrumentId: result.instrumentId || 0n,
        seller: result.seller || '',
        askPriceAlgo: result.askPriceAlgo || 0n,
        askPriceUSDC: result.askPriceUSDC || 0n,
        listingTime: result.listingTime || 0n,
        validUntil: result.validUntil || 0n,
        isActive: result.isActive || false,
        listingType: result.listingType || 0n,
        reservePrice: result.reservePrice || 0n,
        marketplaceFee: result.marketplaceFee || 0n
      }
    } catch (error) {
      console.error('Failed to get listing:', getErrorMessage(error))
      throw new Error(`Failed to get listing: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Get instrument details from registry
   */
  async getInstrumentDetails(instrumentId: bigint): Promise<TradeInstrument | null> {
    try {
      const result = await this.registryClient.getInstrument({
        instrumentId
      })

      // Convert contract response to interface
      return {
        instrumentNumber: result.instrumentNumber || '',
        instrumentType: result.instrumentType || 0n,
        instrumentAssetId: result.instrumentAssetId || 0n,
        issueDate: result.issueDate || 0n,
        maturityDate: result.maturityDate || 0n,
        
        faceValue: result.faceValue || 0n,
        currentMarketValue: result.currentMarketValue || 0n,
        currencyCode: result.currencyCode || '',
        paymentTerms: result.paymentTerms || '',
        
        issuerAddress: result.issuerAddress || '',
        currentHolder: result.currentHolder || '',
        exporterAddress: result.exporterAddress || '',
        importerAddress: result.importerAddress || '',
        
        cargoDescription: result.cargoDescription || '',
        cargoValue: result.cargoValue || 0n,
        weight: result.weight || 0n,
        originPort: result.originPort || '',
        destinationPort: result.destinationPort || '',
        vesselName: result.vesselName || '',
        voyageNumber: result.voyageNumber || '',
        
        riskScore: result.riskScore || 0n,
        instrumentStatus: result.instrumentStatus || 0n,
        
        createdAt: result.createdAt || 0n,
        lastUpdated: result.lastUpdated || 0n,
        endorsementHistory: result.endorsementHistory || []
      }
    } catch (error) {
      console.error('Failed to get instrument details:', error)
      return null
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats() {
    try {
      const result = await this.marketplaceClient.getMarketplaceStats()
      
      return {
        totalVolume: result[0] || 0n,
        totalFees: result[1] || 0n,
        totalListings: result[2] || 0n,
        totalSales: result[3] || 0n
      }
    } catch (error) {
      console.error('Failed to get marketplace stats:', error)
      return {
        totalVolume: 0n,
        totalFees: 0n,
        totalListings: 0n,
        totalSales: 0n
      }
    }
  }
}
