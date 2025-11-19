/**
 * Atomic Marketplace Escrow V5 - Clean Deployment
 * 
 * CHANGES FROM V4:
 * - Fixed box name encoding issues
 * - Clean deployment with no orphaned boxes
 * 
 * Settlement Currency:
 * - 0 = ALGO (native currency)
 * - >0 = ASA ID (e.g., USDCA)
 * 
 * All addresses managed in UI:
 * - Buyer: Txn.sender when calling createTrade()
 * - Seller: Parameter to createTrade()
 * - Financier: Txn.sender when calling escrowTradeAsFinancier()
 * - Regulator: Parameter to executeTrade()
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
  Account,
} from '@algorandfoundation/algorand-typescript'

// Trade state constants
const CREATED = 0 as uint64
const ESCROWED = 1 as uint64
const EXECUTED = 2 as uint64
const PAYMENT_ACKNOWLEDGED = 3 as uint64
const EXPIRED = 4 as uint64
const COMPLETED = 5 as uint64

// Instrument type constants
const BL = 0 as uint64
const WAREHOUSE_RECEIPT = 1 as uint64

/**
 * Trade escrow structure
 */
class TradeEscrow extends arc4.Struct<{
  tradeId: arc4.UintN64
  buyer: arc4.Address
  seller: arc4.Address
  escrowProvider: arc4.Address
  amount: arc4.UintN64
  state: arc4.UintN64
  createdAt: arc4.UintN64
  
  instrumentAssetId: arc4.UintN64
  instrumentType: arc4.UintN64
  instrumentValue: arc4.UintN64
  
  regulatorWallet: arc4.Address
  regulatorTaxPaid: arc4.UintN64
  regulatorRefundDue: arc4.UintN64
  
  marketplaceFee: arc4.UintN64
}> {}

/**
 * Trade metadata structure
 */
class TradeMetadata extends arc4.Struct<{
  productType: arc4.Str
  description: arc4.Str
  ipfsHash: arc4.Str
  leiId: arc4.Str
  leiName: arc4.Str
  instrumentNumber: arc4.Str
}> {}

export default class AtomicMarketplaceEscrowV5 extends Contract {
  /**
   * Storage maps
   */
  public trades = BoxMap<uint64, TradeEscrow>({ keyPrefix: 'trades' })
  public metadata = BoxMap<uint64, TradeMetadata>({ keyPrefix: 'metadata' })
  
  /**
   * Index maps for querying
   */
  public buyerTrades = BoxMap<arc4.Address, arc4.DynamicArray<arc4.UintN64>>({ keyPrefix: 'buyer' })
  public sellerTrades = BoxMap<arc4.Address, arc4.DynamicArray<arc4.UintN64>>({ keyPrefix: 'seller' })
  
  /**
   * Global state
   */
  public nextTradeId = GlobalState<uint64>()
  public platformTreasury = GlobalState<bytes>()
  public settlementCurrency = GlobalState<uint64>()  // 0 = ALGO, ASA ID = that asset
  
  /**
   * Configurable rates (in basis points, 10000 = 100%)
   */
  public regulatorTaxRate = GlobalState<uint64>()
  public regulatorRefundRate = GlobalState<uint64>()
  public marketplaceFeeRate = GlobalState<uint64>()

  /**
   * Initialize marketplace escrow
   * @param settlementAssetId - 0 for ALGO, ASA ID for USDCA
   * @param treasuryAddress - Platform treasury for fees
   */
  @abimethod()
  public initialize(
    settlementAssetId: uint64,
    treasuryAddress: arc4.Address
  ): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can initialize')
    
    this.nextTradeId.value = 1
    this.platformTreasury.value = treasuryAddress.bytes
    this.settlementCurrency.value = settlementAssetId  // 0 = ALGO, >0 = ASA
    
    // Set rates (matching Solidity contract)
    this.regulatorTaxRate.value = 500      // 5.00%
    this.regulatorRefundRate.value = 200   // 2.00%
    this.marketplaceFeeRate.value = 25     // 0.25%
    
    return true
  }

  /**
   * Update settlement currency (admin only)
   */
  @abimethod()
  public setSettlementCurrency(assetId: uint64): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can change settlement')
    this.settlementCurrency.value = assetId
    return true
  }

  /**
   * Update configurable rates (only creator)
   */
  @abimethod()
  public setRates(
    taxRate: uint64,
    refundRate: uint64,
    feeRate: uint64
  ): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can set rates')
    assert(taxRate <= 1000, 'Tax rate too high')
    assert(refundRate <= 500, 'Refund rate too high')
    assert(feeRate <= 100, 'Fee rate too high')
    
    this.regulatorTaxRate.value = taxRate
    this.regulatorRefundRate.value = refundRate
    this.marketplaceFeeRate.value = feeRate
    
    return true
  }

  /**
   * Helper: Check if using ALGO
   */
  private isAlgoPayment(): boolean {
    return this.settlementCurrency.value === 0
  }

  /**
   * Helper: Verify incoming payment transaction
   */
  private verifyPaymentTxn(
    txn: gtxn.PaymentTxn,
    amount: uint64,
    receiver: bytes,
    sender: bytes
  ): void {
    assert(txn.receiver.bytes === receiver, 'Wrong receiver')
    assert(txn.amount === amount, 'Wrong amount')
    assert(txn.sender.bytes === sender, 'Wrong sender')
  }

  /**
   * Helper: Verify incoming asset transfer transaction
   */
  private verifyAssetTransferTxn(
    txn: gtxn.AssetTransferTxn,
    amount: uint64,
    receiver: bytes,
    sender: bytes
  ): void {
    assert(txn.assetReceiver.bytes === receiver, 'Wrong receiver')
    assert(txn.assetAmount === amount, 'Wrong amount')
    assert(txn.xferAsset === Asset(this.settlementCurrency.value), 'Wrong asset')
    assert(txn.sender.bytes === sender, 'Wrong sender')
  }

  /**
   * Helper: Send payment from contract
   */
  private sendPayment(receiver: bytes, amount: uint64): void {
    if (this.isAlgoPayment()) {
      itxn.payment({
        receiver: receiver,
        amount: amount,
        fee: 0
      }).submit()
    } else {
      itxn.assetTransfer({
        xferAsset: Asset(this.settlementCurrency.value),
        assetReceiver: receiver,
        assetAmount: amount,
        fee: 0
      }).submit()
    }
  }

  /**
   * Create trade (buyer initiates)
   * 
   * UI MUST divide instrument price by 100,000 before calling this
   * 
   * @param sellerAddress - Exporter/seller address
   * @param amount - Already divided amount (in microAlgos or microASA)
   * @param productType - Type of product being traded
   * @param description - Trade description
   * @param ipfsHash - IPFS hash of purchase order
   */
  @abimethod()
  public createTrade(
    sellerAddress: arc4.Address,
    amount: uint64,
    productType: string,
    description: string,
    ipfsHash: string
  ): uint64 {
    // Initialize if needed
    if (this.nextTradeId.value === 0) {
      this.nextTradeId.value = 1
    }
    
    assert(sellerAddress.bytes !== Txn.sender.bytes, 'Cannot trade with yourself')
    assert(amount > 0, 'Amount must be greater than 0')
    
    const tradeId = this.nextTradeId.value
    
    // Create trade record
    const trade = new TradeEscrow({
      tradeId: new arc4.UintN64(tradeId),
      buyer: new arc4.Address(Txn.sender),
      seller: sellerAddress,
      escrowProvider: new arc4.Address(Global.zeroAddress),
      amount: new arc4.UintN64(amount),
      state: new arc4.UintN64(CREATED),
      createdAt: new arc4.UintN64(Global.latestTimestamp),
      
      instrumentAssetId: new arc4.UintN64(0),
      instrumentType: new arc4.UintN64(0),
      instrumentValue: new arc4.UintN64(0),
      
      regulatorWallet: new arc4.Address(Global.zeroAddress),
      regulatorTaxPaid: new arc4.UintN64(0),
      regulatorRefundDue: new arc4.UintN64(0),
      
      marketplaceFee: new arc4.UintN64(0)
    })
    
    // Create metadata
    const meta = new TradeMetadata({
      productType: new arc4.Str(productType),
      description: new arc4.Str(description),
      ipfsHash: new arc4.Str(ipfsHash),
      leiId: new arc4.Str(''),
      leiName: new arc4.Str(''),
      instrumentNumber: new arc4.Str('')
    })
    
    // Store trade and metadata
    this.trades(tradeId).value = trade.copy()
    this.metadata(tradeId).value = meta.copy()
    
    // Add to buyer's trades
    this.addToBuyerTrades(new arc4.Address(Txn.sender), tradeId)
    
    // Add to seller's trades
    this.addToSellerTrades(sellerAddress, tradeId)
    
    // Update counter
    this.nextTradeId.value = tradeId + 1
    
    return tradeId
  }

  /**
   * Escrow trade - buyer locks funds (ALGO)
   * 
   * Group transaction structure:
   * [0] Payment (buyer to contract)
   * [1] Application call (this method)
   */
  @abimethod()
  public escrowTrade(paymentTxn: gtxn.PaymentTxn, tradeId: uint64): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === CREATED, 'Trade not in CREATED state')
    assert(trade.buyer.bytes === Txn.sender.bytes, 'Only buyer can escrow')
    
    const marketplaceFee: uint64 = (trade.amount.native * this.marketplaceFeeRate.value) / 10000
    const totalRequired: uint64 = trade.amount.native + marketplaceFee
    
    assert(Global.groupSize === 2, 'Must be group transaction')
    assert(this.isAlgoPayment(), 'Must use ALGO payment for this method')
    
    // Verify payment
    this.verifyPaymentTxn(paymentTxn, totalRequired, Global.currentApplicationAddress.bytes, Txn.sender.bytes)
    
    trade.escrowProvider = new arc4.Address(Txn.sender)
    trade.state = new arc4.UintN64(ESCROWED)
    trade.marketplaceFee = new arc4.UintN64(marketplaceFee)
    
    this.trades(tradeId).value = trade.copy()
    
    return true
  }

  /**
   * Escrow trade - buyer locks funds (ASA)
   * 
   * Group transaction structure:
   * [0] AssetTransfer (buyer to contract)
   * [1] Application call (this method)
   */
  @abimethod()
  public escrowTradeWithAsset(assetTxn: gtxn.AssetTransferTxn, tradeId: uint64): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === CREATED, 'Trade not in CREATED state')
    assert(trade.buyer.bytes === Txn.sender.bytes, 'Only buyer can escrow')
    
    const marketplaceFee: uint64 = (trade.amount.native * this.marketplaceFeeRate.value) / 10000
    const totalRequired: uint64 = trade.amount.native + marketplaceFee
    
    assert(Global.groupSize === 2, 'Must be group transaction')
    assert(!this.isAlgoPayment(), 'Must use ASA payment for this method')
    
    // Verify asset transfer
    this.verifyAssetTransferTxn(assetTxn, totalRequired, Global.currentApplicationAddress.bytes, Txn.sender.bytes)
    
    trade.escrowProvider = new arc4.Address(Txn.sender)
    trade.state = new arc4.UintN64(ESCROWED)
    trade.marketplaceFee = new arc4.UintN64(marketplaceFee)
    
    this.trades(tradeId).value = trade.copy()
    
    return true
  }

  /**
   * Escrow trade as financier - third party locks funds (ALGO)
   * 
   * Group transaction structure:
   * [0] Payment (financier to contract)
   * [1] Application call (this method)
   */
  @abimethod()
  public escrowTradeAsFinancier(paymentTxn: gtxn.PaymentTxn, tradeId: uint64): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === CREATED, 'Trade not in CREATED state')
    assert(Txn.sender.bytes !== trade.buyer.bytes, 'Buyer cannot be financier')
    assert(Txn.sender.bytes !== trade.seller.bytes, 'Seller cannot be financier')
    
    const marketplaceFee: uint64 = (trade.amount.native * this.marketplaceFeeRate.value) / 10000
    const totalRequired: uint64 = trade.amount.native + marketplaceFee
    
    assert(Global.groupSize === 2, 'Must be group transaction')
    assert(this.isAlgoPayment(), 'Must use ALGO payment for this method')
    
    // Verify payment
    this.verifyPaymentTxn(paymentTxn, totalRequired, Global.currentApplicationAddress.bytes, Txn.sender.bytes)
    
    trade.escrowProvider = new arc4.Address(Txn.sender)
    trade.state = new arc4.UintN64(ESCROWED)
    trade.marketplaceFee = new arc4.UintN64(marketplaceFee)
    
    this.trades(tradeId).value = trade.copy()
    
    return true
  }

  /**
   * Escrow trade as financier - third party locks funds (ASA)
   * 
   * Group transaction structure:
   * [0] AssetTransfer (financier to contract)
   * [1] Application call (this method)
   */
  @abimethod()
  public escrowTradeAsFinancierWithAsset(assetTxn: gtxn.AssetTransferTxn, tradeId: uint64): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === CREATED, 'Trade not in CREATED state')
    assert(Txn.sender.bytes !== trade.buyer.bytes, 'Buyer cannot be financier')
    assert(Txn.sender.bytes !== trade.seller.bytes, 'Seller cannot be financier')
    
    const marketplaceFee: uint64 = (trade.amount.native * this.marketplaceFeeRate.value) / 10000
    const totalRequired: uint64 = trade.amount.native + marketplaceFee
    
    assert(Global.groupSize === 2, 'Must be group transaction')
    assert(!this.isAlgoPayment(), 'Must use ASA payment for this method')
    
    // Verify asset transfer
    this.verifyAssetTransferTxn(assetTxn, totalRequired, Global.currentApplicationAddress.bytes, Txn.sender.bytes)
    
    trade.escrowProvider = new arc4.Address(Txn.sender)
    trade.state = new arc4.UintN64(ESCROWED)
    trade.marketplaceFee = new arc4.UintN64(marketplaceFee)
    
    this.trades(tradeId).value = trade.copy()
    
    return true
  }

  /**
   * Execute trade - seller transfers RWA instrument and receives payment (ALGO)
   * 
   * Group transaction structure:
   * [0] Asset transfer (seller sends instrument NFT to buyer/marketplace)
   * [1] Payment (regulator tax payment from seller)
   * [2] Application call (this method - triggers internal payments)
   */
  @abimethod()
  public executeTrade(
    instrumentTxn: gtxn.AssetTransferTxn,
    regulatorPayment: gtxn.PaymentTxn,
    tradeId: uint64,
    instrumentAssetId: uint64,
    instrumentTypeNum: uint64,
    leiId: string,
    leiName: string,
    instrumentNumber: string,
    regulatorWallet: arc4.Address
  ): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === ESCROWED, 'Trade not escrowed')
    assert(trade.seller.bytes === Txn.sender.bytes, 'Only seller can execute')
    assert(regulatorWallet.bytes !== Global.zeroAddress.bytes, 'Invalid regulator address')
    
    assert(
      instrumentTypeNum === BL || 
      instrumentTypeNum === WAREHOUSE_RECEIPT,
      'Invalid instrument type'
    )
    
    const regulatorTax: uint64 = (trade.amount.native * this.regulatorTaxRate.value) / 10000
    const regulatorRefund: uint64 = (trade.amount.native * this.regulatorRefundRate.value) / 10000
    
    assert(Global.groupSize === 3, 'Must be 3-transaction group')
    assert(this.isAlgoPayment(), 'Must use ALGO payment for this method')
    
    // Verify instrument transfer
    assert(instrumentTxn.sender.bytes === Txn.sender.bytes, 'Instrument must come from seller')
    assert(instrumentTxn.xferAsset === Asset(instrumentAssetId), 'Wrong instrument asset')
    assert(instrumentTxn.assetAmount === 1, 'Must transfer 1 instrument NFT')
    
    // Route instrument based on escrow provider
    if (trade.escrowProvider.bytes === trade.buyer.bytes) {
      assert(instrumentTxn.assetReceiver.bytes === trade.buyer.bytes, 'Instrument must go to buyer')
    } else {
      assert(instrumentTxn.assetReceiver.bytes === Global.currentApplicationAddress.bytes, 'Instrument must go to marketplace')
    }
    
    // Verify regulator tax payment
    this.verifyPaymentTxn(regulatorPayment, regulatorTax, regulatorWallet.bytes, Txn.sender.bytes)
    
    // Send marketplace fee to treasury
    this.sendPayment(this.platformTreasury.value, trade.marketplaceFee.native)
    
    // Send payment to seller
    this.sendPayment(trade.seller.bytes, trade.amount.native)
    
    // Update trade state
    trade.state = new arc4.UintN64(EXECUTED)
    trade.instrumentAssetId = new arc4.UintN64(instrumentAssetId)
    trade.instrumentType = new arc4.UintN64(instrumentTypeNum)
    trade.instrumentValue = new arc4.UintN64(trade.amount.native)
    trade.regulatorWallet = regulatorWallet
    trade.regulatorTaxPaid = new arc4.UintN64(regulatorTax)
    trade.regulatorRefundDue = new arc4.UintN64(regulatorRefund)
    
    this.trades(tradeId).value = trade.copy()
    
    // Update metadata
    const meta = this.metadata(tradeId).value.copy()
    meta.leiId = new arc4.Str(leiId)
    meta.leiName = new arc4.Str(leiName)
    meta.instrumentNumber = new arc4.Str(instrumentNumber)
    this.metadata(tradeId).value = meta.copy()
    
    return true
  }

  /**
   * Execute trade - seller transfers RWA instrument and receives payment (ASA)
   * 
   * Group transaction structure:
   * [0] Asset transfer (seller sends instrument NFT to buyer/marketplace)
   * [1] AssetTransfer (regulator tax payment from seller)
   * [2] Application call (this method - triggers internal payments)
   */
  @abimethod()
  public executeTradeWithAsset(
    instrumentTxn: gtxn.AssetTransferTxn,
    regulatorAssetPayment: gtxn.AssetTransferTxn,
    tradeId: uint64,
    instrumentAssetId: uint64,
    instrumentTypeNum: uint64,
    leiId: string,
    leiName: string,
    instrumentNumber: string,
    regulatorWallet: arc4.Address
  ): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === ESCROWED, 'Trade not escrowed')
    assert(trade.seller.bytes === Txn.sender.bytes, 'Only seller can execute')
    assert(regulatorWallet.bytes !== Global.zeroAddress.bytes, 'Invalid regulator address')
    
    assert(
      instrumentTypeNum === BL || 
      instrumentTypeNum === WAREHOUSE_RECEIPT,
      'Invalid instrument type'
    )
    
    const regulatorTax: uint64 = (trade.amount.native * this.regulatorTaxRate.value) / 10000
    const regulatorRefund: uint64 = (trade.amount.native * this.regulatorRefundRate.value) / 10000
    
    assert(Global.groupSize === 3, 'Must be 3-transaction group')
    assert(!this.isAlgoPayment(), 'Must use ASA payment for this method')
    
    // Verify instrument transfer
    assert(instrumentTxn.sender.bytes === Txn.sender.bytes, 'Instrument must come from seller')
    assert(instrumentTxn.xferAsset === Asset(instrumentAssetId), 'Wrong instrument asset')
    assert(instrumentTxn.assetAmount === 1, 'Must transfer 1 instrument NFT')
    
    // Route instrument based on escrow provider
    if (trade.escrowProvider.bytes === trade.buyer.bytes) {
      assert(instrumentTxn.assetReceiver.bytes === trade.buyer.bytes, 'Instrument must go to buyer')
    } else {
      assert(instrumentTxn.assetReceiver.bytes === Global.currentApplicationAddress.bytes, 'Instrument must go to marketplace')
    }
    
    // Verify regulator tax payment
    this.verifyAssetTransferTxn(regulatorAssetPayment, regulatorTax, regulatorWallet.bytes, Txn.sender.bytes)
    
    // Send marketplace fee to treasury
    this.sendPayment(this.platformTreasury.value, trade.marketplaceFee.native)
    
    // Send payment to seller
    this.sendPayment(trade.seller.bytes, trade.amount.native)
    
    // Update trade state
    trade.state = new arc4.UintN64(EXECUTED)
    trade.instrumentAssetId = new arc4.UintN64(instrumentAssetId)
    trade.instrumentType = new arc4.UintN64(instrumentTypeNum)
    trade.instrumentValue = new arc4.UintN64(trade.amount.native)
    trade.regulatorWallet = regulatorWallet
    trade.regulatorTaxPaid = new arc4.UintN64(regulatorTax)
    trade.regulatorRefundDue = new arc4.UintN64(regulatorRefund)
    
    this.trades(tradeId).value = trade.copy()
    
    // Update metadata
    const meta = this.metadata(tradeId).value.copy()
    meta.leiId = new arc4.Str(leiId)
    meta.leiName = new arc4.Str(leiName)
    meta.instrumentNumber = new arc4.Str(instrumentNumber)
    this.metadata(tradeId).value = meta.copy()
    
    return true
  }

  /**
   * Acknowledge payment - seller confirms receipt and triggers regulator refund (ALGO)
   * 
   * Group transaction structure:
   * [0] Payment (regulator sends refund to seller)
   * [1] Application call (this method)
   */
  @abimethod()
  public acknowledgePayment(regulatorRefund: gtxn.PaymentTxn, tradeId: uint64): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === EXECUTED, 'Trade not executed')
    assert(trade.seller.bytes === Txn.sender.bytes, 'Only seller can acknowledge')
    
    assert(Global.groupSize === 2, 'Must be group transaction')
    assert(this.isAlgoPayment(), 'Must use ALGO payment for this method')
    
    // Verify regulator refund
    this.verifyPaymentTxn(regulatorRefund, trade.regulatorRefundDue.native, trade.seller.bytes, trade.regulatorWallet.bytes)
    
    trade.state = new arc4.UintN64(PAYMENT_ACKNOWLEDGED)
    this.trades(tradeId).value = trade.copy()
    
    // Auto-transition to completed
    trade.state = new arc4.UintN64(COMPLETED)
    this.trades(tradeId).value = trade.copy()
    
    return true
  }

  /**
   * Acknowledge payment - seller confirms receipt and triggers regulator refund (ASA)
   * 
   * Group transaction structure:
   * [0] AssetTransfer (regulator sends refund to seller)
   * [1] Application call (this method)
   */
  @abimethod()
  public acknowledgePaymentWithAsset(regulatorRefund: gtxn.AssetTransferTxn, tradeId: uint64): boolean {
    const trade = this.trades(tradeId).value.copy()
    assert(trade.state.native === EXECUTED, 'Trade not executed')
    assert(trade.seller.bytes === Txn.sender.bytes, 'Only seller can acknowledge')
    
    assert(Global.groupSize === 2, 'Must be group transaction')
    assert(!this.isAlgoPayment(), 'Must use ASA payment for this method')
    
    // Verify regulator refund
    this.verifyAssetTransferTxn(regulatorRefund, trade.regulatorRefundDue.native, trade.seller.bytes, trade.regulatorWallet.bytes)
    
    trade.state = new arc4.UintN64(PAYMENT_ACKNOWLEDGED)
    this.trades(tradeId).value = trade.copy()
    
    // Auto-transition to completed
    trade.state = new arc4.UintN64(COMPLETED)
    this.trades(tradeId).value = trade.copy()
    
    return true
  }

  /**
   * Expire trade - admin function to cancel and refund
   */
  @abimethod()
  public expireTrade(tradeId: uint64): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can expire trades')
    
    const trade = this.trades(tradeId).value.copy()
    assert(
      trade.state.native === CREATED ||
      trade.state.native === ESCROWED ||
      trade.state.native === EXECUTED,
      'Cannot expire trade in current state'
    )
    
    // Handle refunds if escrowed
    if (trade.state.native === ESCROWED) {
      const refundAmount: uint64 = trade.amount.native + trade.marketplaceFee.native
      
      // Refund to escrow provider - handles ALGO or ASA
      this.sendPayment(trade.escrowProvider.bytes, refundAmount)
    }
    
    trade.state = new arc4.UintN64(EXPIRED)
    this.trades(tradeId).value = trade.copy()
    
    return true
  }

  // ===== View Functions =====

  /**
   * Get trade details
   */
  @abimethod({ readonly: true })
  public getTrade(tradeId: uint64): TradeEscrow {
    return this.trades(tradeId).value
  }

  /**
   * Get trade metadata
   */
  @abimethod({ readonly: true })
  public getTradeMetadata(tradeId: uint64): TradeMetadata {
    return this.metadata(tradeId).value
  }

  /**
   * Get trades by buyer
   */
  @abimethod({ readonly: true })
  public getTradesByBuyer(buyer: arc4.Address): arc4.DynamicArray<arc4.UintN64> {
    if (this.buyerTrades(buyer).exists) {
      return this.buyerTrades(buyer).value
    }
    return new arc4.DynamicArray<arc4.UintN64>()
  }

  /**
   * Get trades by seller
   */
  @abimethod({ readonly: true })
  public getTradesBySeller(seller: arc4.Address): arc4.DynamicArray<arc4.UintN64> {
    if (this.sellerTrades(seller).exists) {
      return this.sellerTrades(seller).value
    }
    return new arc4.DynamicArray<arc4.UintN64>()
  }

  /**
   * Calculate escrow cost (amount + fee)
   */
  @abimethod({ readonly: true })
  public calculateEscrowCost(amount: uint64): [uint64, uint64] {
    const fee: uint64 = (amount * this.marketplaceFeeRate.value) / 10000
    const totalCost: uint64 = amount + fee
    
    return [totalCost, fee]
  }

  /**
   * Calculate regulator costs
   */
  @abimethod({ readonly: true })
  public calculateRegulatorCosts(amount: uint64): [uint64, uint64] {
    const taxAmount: uint64 = (amount * this.regulatorTaxRate.value) / 10000
    const refundAmount: uint64 = (amount * this.regulatorRefundRate.value) / 10000
    
    return [taxAmount, refundAmount]
  }

  /**
   * Get payment configuration for UI
   */
  @abimethod({ readonly: true })
  public getPaymentConfig(): [uint64, boolean] {
    const isAlgo = this.settlementCurrency.value === 0
    
    return [this.settlementCurrency.value, isAlgo]
  }

  // ===== Helper Functions =====

  private addToBuyerTrades(buyer: arc4.Address, tradeId: uint64): void {
    if (this.buyerTrades(buyer).exists) {
      const trades = this.buyerTrades(buyer).value.copy()
      trades.push(new arc4.UintN64(tradeId))
      this.buyerTrades(buyer).value = trades.copy()
    } else {
      const trades = new arc4.DynamicArray<arc4.UintN64>()
      trades.push(new arc4.UintN64(tradeId))
      this.buyerTrades(buyer).value = trades.copy()
    }
  }

  private addToSellerTrades(seller: arc4.Address, tradeId: uint64): void {
    if (this.sellerTrades(seller).exists) {
      const trades = this.sellerTrades(seller).value.copy()
      trades.push(new arc4.UintN64(tradeId))
      this.sellerTrades(seller).value = trades.copy()
    } else {
      const trades = new arc4.DynamicArray<arc4.UintN64>()
      trades.push(new arc4.UintN64(tradeId))
      this.sellerTrades(seller).value = trades.copy()
    }
  }
}
