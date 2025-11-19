/**
 * Atomic Marketplace V3 - Multi-Asset Payment Support
 *
 * Supports multiple USDC assets with official USDC as default
 * - Official TestNet USDC: 10458941 (default)
 * - Custom USDC: 746654280 (optional)
 * - Works with Lute wallet and all Algorand wallets
 */
import {
  Contract,
  abimethod,
  arc4,
  BoxMap,
  Global,
  GlobalState,
  Txn,
  itxn,
  Asset,
  assert,
  type uint64,
  gtxn,
  type bytes,
} from '@algorandfoundation/algorand-typescript'

/**
 * Simple marketplace listing structure
 */
class InstrumentListing extends arc4.Struct<{
  listingId: arc4.UintN64
  instrumentId: arc4.UintN64
  seller: arc4.Address
  askPriceAlgo: arc4.UintN64
  askPriceUSDC: arc4.UintN64
  listingTime: arc4.UintN64
  validUntil: arc4.UintN64
  isActive: arc4.Bool
  marketplaceFee: arc4.UintN64
}> {}

/**
 * Sale record structure
 */
class InstrumentSale extends arc4.Struct<{
  saleId: arc4.UintN64
  instrumentId: arc4.UintN64
  seller: arc4.Address
  buyer: arc4.Address
  salePrice: arc4.UintN64
  currency: arc4.UintN64
  saleTime: arc4.UintN64
}> {}

export default class AtomicMarketplaceV3 extends Contract {
  /**
   * Storage maps
   */
  public listings = BoxMap<uint64, InstrumentListing>({ keyPrefix: 'listings' })
  public sales = BoxMap<uint64, InstrumentSale>({ keyPrefix: 'sales' })
  public activeListings = BoxMap<uint64, arc4.Bool>({ keyPrefix: 'active' })
  
  /**
   * NEW: Multi-asset payment support
   * Maps asset IDs to whether they're accepted for payment
   */
  public acceptedPaymentAssets = BoxMap<uint64, arc4.Bool>({ keyPrefix: 'payments' })
  
  /**
   * Global state
   */
  public nextListingId = GlobalState<uint64>()
  public nextSaleId = GlobalState<uint64>()
  public totalVolume = GlobalState<uint64>()
  public totalFees = GlobalState<uint64>()
  public marketplaceFeeRate = GlobalState<uint64>()
  
  /**
   * NEW: Default USDC asset (official TestNet USDC: 10458941)
   */
  public defaultUsdcAssetId = GlobalState<uint64>()

  /**
   * Initialize marketplace with default USDC
   * @param defaultUsdcAssetId - Official USDC asset ID (10458941 for TestNet)
   */
  @abimethod()
  public initialize(defaultUsdcAssetId: uint64): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can initialize')
    
    this.nextListingId.value = 1
    this.nextSaleId.value = 1
    this.totalVolume.value = 0
    this.totalFees.value = 0
    this.marketplaceFeeRate.value = 100 // 1%
    
    // Set default USDC (official TestNet USDC)
    this.defaultUsdcAssetId.value = defaultUsdcAssetId
    
    // Mark default USDC as accepted payment asset
    this.acceptedPaymentAssets(defaultUsdcAssetId).value = new arc4.Bool(true)
    
    return true
  }

  /**
   * NEW: Add additional payment asset (e.g., custom USDC)
   * Only creator can add payment assets
   * @param assetId - Asset ID to accept as payment (e.g., 746654280 for custom USDC)
   */
  @abimethod()
  public addPaymentAsset(assetId: uint64): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can add payment assets')
    
    // Mark asset as accepted
    this.acceptedPaymentAssets(assetId).value = new arc4.Bool(true)
    
    return true
  }

  /**
   * NEW: Remove payment asset
   * Only creator can remove payment assets
   * @param assetId - Asset ID to remove from accepted payments
   */
  @abimethod()
  public removePaymentAsset(assetId: uint64): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can remove payment assets')
    assert(assetId !== this.defaultUsdcAssetId.value, 'Cannot remove default USDC')
    
    // Mark asset as not accepted
    this.acceptedPaymentAssets(assetId).value = new arc4.Bool(false)
    
    return true
  }

  /**
   * NEW: Check if asset is accepted for payment
   * @param assetId - Asset ID to check
   */
  @abimethod({ readonly: true })
  public isPaymentAssetAccepted(assetId: uint64): boolean {
    if (!this.acceptedPaymentAssets(assetId).exists) {
      return false
    }
    return this.acceptedPaymentAssets(assetId).value.native
  }

  /**
   * NEW: Get default USDC asset ID
   */
  @abimethod({ readonly: true })
  public getDefaultUsdcAssetId(): uint64 {
    return this.defaultUsdcAssetId.value
  }

  /**
   * List instrument for sale
   */
  @abimethod()
  public listInstrument(
    instrumentId: uint64,
    askPriceAlgo: uint64,
    askPriceUSDC: uint64,
    validityPeriod: uint64
  ): uint64 {
    // Initialize if needed
    if (this.nextListingId.value === 0) {
      this.nextListingId.value = 1
      this.nextSaleId.value = 1
      this.totalVolume.value = 0
      this.totalFees.value = 0
      this.marketplaceFeeRate.value = 100 // 1%
    }
    
    // Must accept at least one currency
    assert(askPriceAlgo > 0 || askPriceUSDC > 0, 'Must set price in at least one currency')
    
    const listingId = this.nextListingId.value
    
    const listing = new InstrumentListing({
      listingId: new arc4.UintN64(listingId),
      instrumentId: new arc4.UintN64(instrumentId),
      seller: new arc4.Address(Txn.sender),
      askPriceAlgo: new arc4.UintN64(askPriceAlgo),
      askPriceUSDC: new arc4.UintN64(askPriceUSDC),
      listingTime: new arc4.UintN64(Global.latestTimestamp),
      validUntil: new arc4.UintN64(Global.latestTimestamp + validityPeriod),
      isActive: new arc4.Bool(true),
      marketplaceFee: new arc4.UintN64(this.marketplaceFeeRate.value)
    })
    
    // Store listing - copy is required for new structs being stored
    this.listings(listingId).value = listing.copy()
    this.activeListings(listingId).value = new arc4.Bool(true)
    this.nextListingId.value = listingId + 1
    
    return listingId
  }

  /**
   * Purchase instrument with ALGO payment
   */
  @abimethod()
  public purchaseWithAlgo(
    listingId: uint64,
    payment: gtxn.PaymentTxn
  ): boolean {
    assert(this.listings(listingId).exists, 'Listing not found')
    const listing = this.listings(listingId).value.copy()
    
    // Validate listing
    assert(listing.isActive.native === true, 'Listing inactive')
    assert(listing.validUntil.native > Global.latestTimestamp, 'Listing expired')
    assert(listing.askPriceAlgo.native > 0, 'ALGO not accepted for this listing')
    
    // Validate payment
    assert(payment.amount === listing.askPriceAlgo.native, 'Incorrect payment amount')
    assert(payment.receiver === Global.currentApplicationAddress, 'Payment to wrong address')
    assert(payment.sender === Txn.sender, 'Payment sender mismatch')
    
    // Execute atomic settlement
    this.executeAtomicSettlement(
      listing,
      Txn.sender.bytes,
      payment.amount,
      1, // ALGO currency
      0  // No asset ID for ALGO
    )
    
    return true
  }

  /**
   * UPDATED: Purchase instrument with USDC payment (supports multiple USDC assets)
   * Accepts official USDC (10458941) and any other approved payment assets
   */
  @abimethod()
  public purchaseWithUSDC(
    listingId: uint64,
    payment: gtxn.AssetTransferTxn
  ): boolean {
    assert(this.listings(listingId).exists, 'Listing not found')
    const listing = this.listings(listingId).value.copy()
    
    // Validate listing
    assert(listing.isActive.native === true, 'Listing inactive')
    assert(listing.validUntil.native > Global.latestTimestamp, 'Listing expired')
    assert(listing.askPriceUSDC.native > 0, 'USDC not accepted for this listing')
    
    // Validate USDC payment
    assert(payment.assetAmount === listing.askPriceUSDC.native, 'Incorrect payment amount')
    assert(payment.assetReceiver === Global.currentApplicationAddress, 'Payment to wrong address')
    assert(payment.sender === Txn.sender, 'Payment sender mismatch')
    
    // NEW: Validate payment asset is accepted (official or custom USDC)
    assert(
      this.acceptedPaymentAssets(payment.xferAsset.id).exists &&
      this.acceptedPaymentAssets(payment.xferAsset.id).value.native === true,
      'Payment asset not accepted'
    )
    
    // Execute atomic settlement
    this.executeAtomicSettlement(
      listing,
      Txn.sender.bytes,
      payment.assetAmount,
      2, // USDC currency
      payment.xferAsset.id // Store which USDC asset was used
    )
    
    return true
  }

  /**
   * UPDATED: Execute atomic settlement (supports multiple payment assets)
   */
  private executeAtomicSettlement(
    listing: InstrumentListing,
    buyer: bytes,
    totalAmount: uint64,
    currency: uint64,
    assetId: uint64
  ) {
    // Calculate fees (simplified - use integer division)
    const marketplaceFee: uint64 = totalAmount / 100 // 1% fee
    const sellerAmount: uint64 = totalAmount - marketplaceFee
    
    if (currency === 1) { // ALGO
      // Pay seller
      itxn
        .payment({
          amount: sellerAmount,
          receiver: listing.seller.bytes,
          fee: 0,
        })
        .submit()
    } else { // USDC (or other asset)
      // Pay seller in the asset they received (official or custom USDC)
      itxn
        .assetTransfer({
          xferAsset: Asset(assetId),
          assetReceiver: listing.seller.bytes,
          assetAmount: sellerAmount,
          fee: 0,
        })
        .submit()
    }
    
    // Transfer instrument to buyer
    itxn
      .assetTransfer({
        xferAsset: Asset(listing.instrumentId.native),
        assetReceiver: buyer,
        assetAmount: 1,
        fee: 0,
      })
      .submit()
    
    // Record sale with the asset ID used
    this.recordSale(listing, buyer, totalAmount, assetId === 0 ? currency : assetId)
    
    // Deactivate listing
    this.listings(listing.listingId.native).value = new InstrumentListing({
      ...listing,
      isActive: new arc4.Bool(false)
    })
    this.activeListings(listing.listingId.native).value = new arc4.Bool(false)
    
    // Update metrics
    this.totalVolume.value = this.totalVolume.value + totalAmount
    this.totalFees.value = this.totalFees.value + marketplaceFee
  }

  /**
   * Record completed sale
   */
  private recordSale(
    listing: InstrumentListing,
    buyer: bytes,
    salePrice: uint64,
    currency: uint64
  ) {
    const saleId = this.nextSaleId.value
    
    const sale = new InstrumentSale({
      saleId: new arc4.UintN64(saleId),
      instrumentId: listing.instrumentId,
      seller: listing.seller,
      buyer: new arc4.Address(buyer),
      salePrice: new arc4.UintN64(salePrice),
      currency: new arc4.UintN64(currency),
      saleTime: new arc4.UintN64(Global.latestTimestamp)
    })
    
    // Store sale - copy is required for new structs being stored
    this.sales(saleId).value = sale.copy()
    this.nextSaleId.value = saleId + 1
  }

  /**
   * Cancel listing
   */
  @abimethod()
  public cancelListing(listingId: uint64): boolean {
    assert(this.listings(listingId).exists, 'Listing not found')
    const listing = this.listings(listingId).value.copy()
    
    // Only seller can cancel
    assert(listing.seller.bytes === Txn.sender.bytes, 'Only seller can cancel')
    assert(listing.isActive.native === true, 'Listing already inactive')
    
    // Deactivate listing
    this.listings(listingId).value = new InstrumentListing({
      ...listing,
      isActive: new arc4.Bool(false)
    })
    this.activeListings(listingId).value = new arc4.Bool(false)
    
    return true
  }

  /**
   * Get listing details
   */
  @abimethod({ readonly: true })
  public getListing(listingId: uint64): InstrumentListing {
    assert(this.listings(listingId).exists, 'Listing not found')
    return this.listings(listingId).value
  }

  /**
   * Get sale details
   */
  @abimethod({ readonly: true })
  public getSale(saleId: uint64): InstrumentSale {
    assert(this.sales(saleId).exists, 'Sale not found')
    return this.sales(saleId).value
  }

  /**
   * Get marketplace statistics
   */
  @abimethod({ readonly: true })
  public getMarketplaceStats(): [arc4.UintN64, arc4.UintN64, arc4.UintN64, arc4.UintN64] {
    return [
      new arc4.UintN64(this.totalVolume.value),
      new arc4.UintN64(this.totalFees.value),
      new arc4.UintN64(this.nextListingId.value - 1),
      new arc4.UintN64(this.nextSaleId.value - 1)
    ]
  }
}
