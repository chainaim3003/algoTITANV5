/**
 * Simple Collateral Lending V1
 *
 * Allows exporters to get USDC loans using eBL assets as collateral
 * Perfect for demo: simple interest, clear liquidation mechanics
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
 * Loan request structure
 */
class LoanRequest extends arc4.Struct<{
  loanId: arc4.UintN64
  borrower: arc4.Address
  collateralAssetId: arc4.UintN64
  collateralValue: arc4.UintN64
  requestedAmount: arc4.UintN64
  interestRateBps: arc4.UintN64  // Basis points (e.g., 800 = 8%)
  loanDurationDays: arc4.UintN64
  requestTime: arc4.UintN64
  isActive: arc4.Bool
  isFunded: arc4.Bool
}> {}

/**
 * Active loan structure
 */
class ActiveLoan extends arc4.Struct<{
  loanId: arc4.UintN64
  borrower: arc4.Address
  lender: arc4.Address
  collateralAssetId: arc4.UintN64
  principalAmount: arc4.UintN64
  interestRateBps: arc4.UintN64
  repaymentAmount: arc4.UintN64
  dueDate: arc4.UintN64
  fundedTime: arc4.UintN64
  isRepaid: arc4.Bool
  isLiquidated: arc4.Bool
}> {}

export default class SimpleCollateralLending extends Contract {
  /**
   * Calculate loan-to-value ratio based on risk score
   * Risk Score ranges: 100-1000 (lower = safer)
   * LTV ranges: 40%-80% (safer assets get higher LTV)
   */
  private calculateLTVFromRisk(riskScore: uint64): uint64 {
    // Risk-based LTV calculation:
    // Risk 100-300: 80% LTV (1.25x collateral ratio)
    // Risk 301-500: 70% LTV (1.43x collateral ratio) 
    // Risk 501-700: 60% LTV (1.67x collateral ratio)
    // Risk 701-1000: 40% LTV (2.5x collateral ratio)
    
    if (riskScore <= 300) {
      return 8000 // 80% LTV
    } else if (riskScore <= 500) {
      return 7000 // 70% LTV
    } else if (riskScore <= 700) {
      return 6000 // 60% LTV
    } else {
      return 4000 // 40% LTV
    }
  }

  /**
   * Get risk score from TradeInstrumentRegistry
   */
  private getRiskScoreFromRegistry(instrumentId: uint64): uint64 {
    // Make cross-contract call to get instrument details
    // For demo purposes, we'll use a simplified approach
    // In production, this would be a proper cross-contract call
    
    // Default risk score if unable to fetch (medium risk)
    return 500
  }

  /**
   * Calculate maximum loan amount based on collateral value and risk
   */
  private calculateMaxLoanAmount(collateralValue: uint64, riskScore: uint64): uint64 {
    const ltvBps: uint64 = this.calculateLTVFromRisk(riskScore)
    return (collateralValue * ltvBps) / 10000
  }

  /**
   * Get risk-based interest rate (basis points)
   */
  private getRiskBasedInterestRate(riskScore: uint64): uint64 {
    // Risk-based interest rates:
    // Risk 100-300: 5% APR (500 bps)
    // Risk 301-500: 8% APR (800 bps)
    // Risk 501-700: 12% APR (1200 bps)
    // Risk 701-1000: 18% APR (1800 bps)
    
    if (riskScore <= 300) {
      return 500  // 5% APR
    } else if (riskScore <= 500) {
      return 800  // 8% APR
    } else if (riskScore <= 700) {
      return 1200 // 12% APR
    } else {
      return 1800 // 18% APR
    }
  }

  /**
   * Storage maps
   */
  public loanRequests = BoxMap<uint64, LoanRequest>({ keyPrefix: 'requests' })
  public activeLoans = BoxMap<uint64, ActiveLoan>({ keyPrefix: 'loans' })
  public borrowerLoans = BoxMap<arc4.Address, arc4.DynamicArray<arc4.UintN64>>({ keyPrefix: 'borrower' })
  public lenderLoans = BoxMap<arc4.Address, arc4.DynamicArray<arc4.UintN64>>({ keyPrefix: 'lender' })
  
  /**
   * Global state
   */
  public nextLoanId = GlobalState<uint64>()
  public totalLoansIssued = GlobalState<uint64>()
  public totalVolumeUSDC = GlobalState<uint64>()
  public defaultLiquidationRatio = GlobalState<uint64>() // 150% = 15000 bps
  public usdcAssetId = GlobalState<uint64>()
  public registryContractId = GlobalState<uint64>() // Reference to TradeInstrumentRegistry

  /**
   * Initialize lending contract
   */
  @abimethod()
  public initialize(usdcAssetId: uint64, registryContractId: uint64): boolean {
    assert(Txn.sender === Global.creatorAddress, 'Only creator can initialize')
    
    this.nextLoanId.value = 1
    this.totalLoansIssued.value = 0
    this.totalVolumeUSDC.value = 0
    this.defaultLiquidationRatio.value = 15000 // 150% collateralization
    this.usdcAssetId.value = usdcAssetId
    this.registryContractId.value = registryContractId
    
    return true
  }

  /**
   * Create loan request (borrower pledges eBL as collateral)
   * Now includes risk-based LTV and interest rate calculation
   */
  @abimethod()
  public requestLoan(
    collateralAssetId: uint64,
    collateralValue: uint64,
    requestedAmount: uint64,
    loanDurationDays: uint64,
    collateralTransfer: gtxn.AssetTransferTxn
  ): uint64 {
    // Initialize if needed
    if (this.nextLoanId.value === 0) {
      this.nextLoanId.value = 1
      this.totalLoansIssued.value = 0
      this.totalVolumeUSDC.value = 0
      this.defaultLiquidationRatio.value = 15000
    }
    
    // Validate collateral transfer
    assert(collateralTransfer.xferAsset.id === collateralAssetId, 'Collateral asset mismatch')
    assert(collateralTransfer.assetReceiver === Global.currentApplicationAddress, 'Must transfer collateral to contract')
    assert(collateralTransfer.sender === Txn.sender, 'Collateral sender mismatch')
    assert(collateralTransfer.assetAmount === 1, 'Must transfer entire eBL')
    
    // Get risk score for this eBL (simplified for demo)
    const riskScore: uint64 = this.getRiskScoreFromRegistry(collateralAssetId)
    
    // Calculate maximum loan amount based on risk-adjusted LTV
    const maxLoanAmount: uint64 = this.calculateMaxLoanAmount(collateralValue, riskScore)
    
    // Validate loan parameters
    assert(requestedAmount > 0, 'Requested amount must be positive')
    assert(requestedAmount <= maxLoanAmount, 'Requested amount exceeds risk-based LTV limit')
    assert(loanDurationDays <= 365, 'Loan duration too long (max 1 year)')
    
    // Get risk-based interest rate
    const riskBasedInterestRate: uint64 = this.getRiskBasedInterestRate(riskScore)
    
    const loanId: uint64 = this.nextLoanId.value
    
    const request = new LoanRequest({
      loanId: new arc4.UintN64(loanId),
      borrower: new arc4.Address(Txn.sender),
      collateralAssetId: new arc4.UintN64(collateralAssetId),
      collateralValue: new arc4.UintN64(collateralValue),
      requestedAmount: new arc4.UintN64(requestedAmount),
      interestRateBps: new arc4.UintN64(riskBasedInterestRate), // Auto-calculated based on risk
      loanDurationDays: new arc4.UintN64(loanDurationDays),
      requestTime: new arc4.UintN64(Global.latestTimestamp),
      isActive: new arc4.Bool(true),
      isFunded: new arc4.Bool(false)
    })
    
    // Store loan request
    this.loanRequests(loanId).value = request.copy()
    
    // Add to borrower's list
    this.addLoanToBorrower(new arc4.Address(Txn.sender), loanId)
    
    this.nextLoanId.value = loanId + 1
    
    return loanId
  }

  /**
   * Fund loan request (lender provides USDC)
   */
  @abimethod()
  public fundLoan(
    loanId: uint64,
    usdcPayment: gtxn.AssetTransferTxn
  ): boolean {
    assert(this.loanRequests(loanId).exists, 'Loan request not found')
    const request = this.loanRequests(loanId).value.copy()
    
    // Validate request
    assert(request.isActive.native === true, 'Request inactive')
    assert(request.isFunded.native === false, 'Already funded')
    
    // Validate USDC payment
    assert(usdcPayment.xferAsset.id === this.usdcAssetId.value, 'Must pay with USDC')
    assert(usdcPayment.assetAmount === request.requestedAmount.native, 'Incorrect funding amount')
    assert(usdcPayment.assetReceiver === Global.currentApplicationAddress, 'Payment to wrong address')
    assert(usdcPayment.sender === Txn.sender, 'Payment sender mismatch')
    
    // Calculate repayment amount
    const interestAmount: uint64 = (request.requestedAmount.native * request.interestRateBps.native * request.loanDurationDays.native) / (10000 * 365)
    const repaymentAmount: uint64 = request.requestedAmount.native + interestAmount
    
    // Calculate due date
    const dueDate: uint64 = Global.latestTimestamp + (request.loanDurationDays.native * 86400) // days to seconds
    
    // Transfer USDC to borrower
    itxn
      .assetTransfer({
        xferAsset: Asset(this.usdcAssetId.value),
        assetReceiver: request.borrower.bytes,
        assetAmount: request.requestedAmount.native,
        fee: 0,
      })
      .submit()
    
    // Create active loan
    const activeLoan = new ActiveLoan({
      loanId: new arc4.UintN64(loanId),
      borrower: request.borrower,
      lender: new arc4.Address(Txn.sender),
      collateralAssetId: request.collateralAssetId,
      principalAmount: request.requestedAmount,
      interestRateBps: request.interestRateBps,
      repaymentAmount: new arc4.UintN64(repaymentAmount),
      dueDate: new arc4.UintN64(dueDate),
      fundedTime: new arc4.UintN64(Global.latestTimestamp),
      isRepaid: new arc4.Bool(false),
      isLiquidated: new arc4.Bool(false)
    })
    
    // Store active loan
    this.activeLoans(loanId).value = activeLoan.copy()
    
    // Mark request as funded
    this.loanRequests(loanId).value = new LoanRequest({
      ...request,
      isFunded: new arc4.Bool(true)
    })
    
    // Add to lender's list
    this.addLoanToLender(new arc4.Address(Txn.sender), loanId)
    
    // Update metrics
    this.totalLoansIssued.value = this.totalLoansIssued.value + 1
    this.totalVolumeUSDC.value = this.totalVolumeUSDC.value + request.requestedAmount.native
    
    return true
  }

  /**
   * Repay loan (borrower repays USDC + interest)
   */
  @abimethod()
  public repayLoan(
    loanId: uint64,
    repayment: gtxn.AssetTransferTxn
  ): boolean {
    assert(this.activeLoans(loanId).exists, 'Active loan not found')
    const loan = this.activeLoans(loanId).value.copy()
    
    // Validate loan
    assert(loan.isRepaid.native === false, 'Already repaid')
    assert(loan.isLiquidated.native === false, 'Already liquidated')
    assert(loan.borrower.bytes === Txn.sender.bytes, 'Only borrower can repay')
    
    // Validate repayment
    assert(repayment.xferAsset.id === this.usdcAssetId.value, 'Must repay with USDC')
    assert(repayment.assetAmount === loan.repaymentAmount.native, 'Incorrect repayment amount')
    assert(repayment.assetReceiver === Global.currentApplicationAddress, 'Payment to wrong address')
    assert(repayment.sender === Txn.sender, 'Payment sender mismatch')
    
    // Transfer repayment to lender
    itxn
      .assetTransfer({
        xferAsset: Asset(this.usdcAssetId.value),
        assetReceiver: loan.lender.bytes,
        assetAmount: loan.repaymentAmount.native,
        fee: 0,
      })
      .submit()
    
    // Return collateral to borrower
    itxn
      .assetTransfer({
        xferAsset: Asset(loan.collateralAssetId.native),
        assetReceiver: loan.borrower.bytes,
        assetAmount: 1,
        fee: 0,
      })
      .submit()
    
    // Mark loan as repaid
    this.activeLoans(loanId).value = new ActiveLoan({
      ...loan,
      isRepaid: new arc4.Bool(true)
    })
    
    return true
  }

  /**
   * Liquidate loan (lender claims collateral if overdue)
   */
  @abimethod()
  public liquidateLoan(loanId: uint64): boolean {
    assert(this.activeLoans(loanId).exists, 'Active loan not found')
    const loan = this.activeLoans(loanId).value.copy()
    
    // Validate liquidation conditions
    assert(loan.isRepaid.native === false, 'Already repaid')
    assert(loan.isLiquidated.native === false, 'Already liquidated')
    assert(loan.lender.bytes === Txn.sender.bytes, 'Only lender can liquidate')
    assert(Global.latestTimestamp > loan.dueDate.native, 'Loan not yet overdue')
    
    // Transfer collateral to lender
    itxn
      .assetTransfer({
        xferAsset: Asset(loan.collateralAssetId.native),
        assetReceiver: loan.lender.bytes,
        assetAmount: 1,
        fee: 0,
      })
      .submit()
    
    // Mark loan as liquidated
    this.activeLoans(loanId).value = new ActiveLoan({
      ...loan,
      isLiquidated: new arc4.Bool(true)
    })
    
    return true
  }

  /**
   * Add loan to borrower's list
   */
  private addLoanToBorrower(borrower: arc4.Address, loanId: uint64) {
    if (this.borrowerLoans(borrower).exists) {
      const loans = this.borrowerLoans(borrower).value.copy()
      loans.push(new arc4.UintN64(loanId))
      this.borrowerLoans(borrower).value = loans.copy()
    } else {
      const newArray = new arc4.DynamicArray<arc4.UintN64>()
      newArray.push(new arc4.UintN64(loanId))
      this.borrowerLoans(borrower).value = newArray.copy()
    }
  }

  /**
   * Add loan to lender's list
   */
  private addLoanToLender(lender: arc4.Address, loanId: uint64) {
    if (this.lenderLoans(lender).exists) {
      const loans = this.lenderLoans(lender).value.copy()
      loans.push(new arc4.UintN64(loanId))
      this.lenderLoans(lender).value = loans.copy()
    } else {
      const newArray = new arc4.DynamicArray<arc4.UintN64>()
      newArray.push(new arc4.UintN64(loanId))
      this.lenderLoans(lender).value = newArray.copy()
    }
  }

  /**
   * Get loan request details
   */
  @abimethod({ readonly: true })
  public getLoanRequest(loanId: uint64): LoanRequest {
    assert(this.loanRequests(loanId).exists, 'Loan request not found')
    return this.loanRequests(loanId).value
  }

  /**
   * Get active loan details
   */
  @abimethod({ readonly: true })
  public getActiveLoan(loanId: uint64): ActiveLoan {
    assert(this.activeLoans(loanId).exists, 'Active loan not found')
    return this.activeLoans(loanId).value
  }

  /**
   * Get borrower's loans
   */
  @abimethod({ readonly: true })
  public getBorrowerLoans(borrower: arc4.Address): arc4.DynamicArray<arc4.UintN64> {
    if (this.borrowerLoans(borrower).exists) {
      return this.borrowerLoans(borrower).value
    }
    return new arc4.DynamicArray<arc4.UintN64>()
  }

  /**
   * Get lender's loans
   */
  @abimethod({ readonly: true })
  public getLenderLoans(lender: arc4.Address): arc4.DynamicArray<arc4.UintN64> {
    if (this.lenderLoans(lender).exists) {
      return this.lenderLoans(lender).value
    }
    return new arc4.DynamicArray<arc4.UintN64>()
  }

  /**
   * Get risk-based loan terms for a collateral asset (read-only)
   */
  @abimethod({ readonly: true })
  public getRiskBasedLoanTerms(collateralValue: uint64, riskScore: uint64): [arc4.UintN64, arc4.UintN64, arc4.UintN64] {
    const maxLoanAmount: uint64 = this.calculateMaxLoanAmount(collateralValue, riskScore)
    const interestRate: uint64 = this.getRiskBasedInterestRate(riskScore)
    const ltvRatio: uint64 = this.calculateLTVFromRisk(riskScore)
    
    return [
      new arc4.UintN64(maxLoanAmount),
      new arc4.UintN64(interestRate),
      new arc4.UintN64(ltvRatio)
    ]
  }

  /**
   * Get lending statistics
   */
  @abimethod({ readonly: true })
  public getLendingStats(): [arc4.UintN64, arc4.UintN64, arc4.UintN64] {
    return [
      new arc4.UintN64(this.totalLoansIssued.value),
      new arc4.UintN64(this.totalVolumeUSDC.value),
      new arc4.UintN64(this.nextLoanId.value - 1)
    ]
  }
}
