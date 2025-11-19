/**
 * V3 Contract Types and Interfaces
 * 
 * Type definitions for the simplified marketplace flow
 */

// Core trade instrument structure
export interface TradeInstrument {
  instrumentNumber: string
  instrumentType: bigint
  instrumentAssetId: bigint
  issueDate: bigint
  maturityDate: bigint
  
  faceValue: bigint
  currentMarketValue: bigint
  currencyCode: string
  paymentTerms: string
  
  issuerAddress: string
  currentHolder: string
  exporterAddress: string
  importerAddress: string
  
  cargoDescription: string
  cargoValue: bigint
  weight: bigint
  originPort: string
  destinationPort: string
  vesselName: string
  voyageNumber: string
  
  riskScore: bigint
  instrumentStatus: bigint
  
  createdAt: bigint
  lastUpdated: bigint
  endorsementHistory: string[]
}

// Marketplace listing structure
export interface InstrumentListing {
  listingId: bigint
  instrumentId: bigint
  seller: string
  askPriceAlgo: bigint
  askPriceUSDC: bigint
  listingTime: bigint
  validUntil: bigint
  isActive: boolean
  listingType: bigint
  reservePrice: bigint
  marketplaceFee: bigint
}

// Sale record
export interface InstrumentSale {
  saleId: bigint
  instrumentId: bigint
  seller: string
  buyer: string
  salePrice: bigint
  currency: bigint
  marketplaceFee: bigint
  saleTime: bigint
  txnHash: string
}

// Discount bid
export interface DiscountBid {
  bidId: bigint
  instrumentId: bigint
  bidder: string
  bidAmount: bigint
  discountRate: bigint
  currency: bigint
  validUntil: bigint
  isActive: boolean
  financingTerms: string
}

// Enums for better type safety
export enum Currency {
  ALGO = 1,
  USDC = 2
}

export enum ListingType {
  FIXED_PRICE = 1,
  AUCTION = 2,
  DISCOUNT_BID = 3
}

export enum InstrumentStatus {
  ACTIVE = 1,
  LISTED = 2,
  PLEDGED = 3,
  SETTLED = 4
}

export enum InstrumentType {
  eBL = 1,
  LC = 2,
  INVOICE = 3
}

// Configuration interface
export interface V3Config {
  network: 'localnet' | 'testnet' | 'mainnet'
  contracts: {
    registry: number
    marketplace: number
    financePool?: number
    lending: number
  }
  assets: {
    usdcAssetId: number
  }
  features: {
    enableTrading: boolean
    enableLending: boolean
    enablePools: boolean
    enableRiskScoring: boolean
  }
}

// Contract clients interface
export interface ContractClients {
  algorand: any // AlgorandClient
  registry: any
  marketplace: any
  financePool?: any
  lending?: any
  config: V3Config
}

// API interfaces for service layer
export interface ListInstrumentRequest {
  instrumentAssetId: bigint
  priceAlgo?: bigint
  priceUSDC?: bigint
  validityDays: number
  sellerAddress: string
}

export interface ListInstrumentResponse {
  listingId: bigint
  txnId: string
}

export interface PurchaseWithAlgoRequest {
  listingId: bigint
  buyerAddress: string
  paymentAmount: bigint
}

export interface PurchaseWithUSDCRequest {
  listingId: bigint
  buyerAddress: string
  paymentAmount: bigint
}

export interface PurchaseResponse {
  saleId: bigint
  txnId: string
  instrumentAssetId: bigint
}

// Dashboard data interfaces
export interface ExporterDashboardData {
  instruments: TradeInstrument[]
  totalValue: bigint
  activeListings: number
}

export interface ImporterDashboardData {
  instruments: TradeInstrument[]
  totalValue: bigint
  recentPurchases: InstrumentSale[]
}

export interface MarketplaceData {
  listings: InstrumentListing[]
  recentSales: InstrumentSale[]
  totalVolume: bigint
  totalListings: number
}

// Form interfaces
export interface SellInstrumentFormData {
  priceAlgo?: string
  priceUSDC?: string
  validityDays: number
  currency: 'ALGO' | 'USDC' | 'BOTH'
}

// Carrier authorization
export interface CarrierAuthorization {
  carrierAddress: string
  exporterAddress: string
  maxCargoValue: bigint
  validUntil: bigint
  isActive: boolean
  createdAt: bigint
}

// Enriched BL data
export interface EnrichedBLData {
  blNumber: string
  cargoManifest: string
  loadingDate: bigint
  estimatedArrival: bigint
  shippingRoute: string
  containerNumbers: string
  sealNumbers: string
  specialInstructions: string
  insurancePolicy: string
  customsDeclaration: string
}

// Lending-related interfaces
export interface LoanRequest {
  loanId: bigint
  borrower: string
  collateralAssetId: bigint
  collateralValue: bigint
  requestedAmount: bigint
  interestRateBps: bigint
  loanDurationDays: bigint
  requestTime: bigint
  isActive: boolean
  isFunded: boolean
}

export interface ActiveLoan {
  loanId: bigint
  borrower: string
  lender: string
  collateralAssetId: bigint
  principalAmount: bigint
  interestRateBps: bigint
  repaymentAmount: bigint
  dueDate: bigint
  fundedTime: bigint
  isRepaid: boolean
  isLiquidated: boolean
}

export interface LoanTerms {
  maxLoanAmount: bigint
  interestRate: bigint
  ltvRatio: bigint
}

export interface LendingStats {
  totalLoansIssued: bigint
  totalVolumeUSDC: bigint
  activeLoanCount: bigint
}

// Lending API interfaces
export interface RequestLoanRequest {
  collateralAssetId: bigint
  collateralValue: bigint
  requestedAmount: bigint
  loanDurationDays: bigint
  borrowerAddress: string
}

export interface FundLoanRequest {
  loanId: bigint
  fundingAmount: bigint
  lenderAddress: string
}

export interface RepayLoanRequest {
  loanId: bigint
  repaymentAmount: bigint
  borrowerAddress: string
}

// Dashboard data for lending
export interface LendingDashboardData {
  borrowerLoans: LoanRequest[]
  lenderLoans: ActiveLoan[]
  availableLoans: LoanRequest[]
  lendingStats: LendingStats
}
