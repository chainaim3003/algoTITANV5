/**
 * Demo Currency Converter
 * 
 * Converts real USD amounts to small ALGO amounts for demonstration purposes
 * Exchange Rate: $100,000 USD = 1 ALGO
 * 
 * This makes testnet transactions affordable and easy to understand.
 * In production, this will use real-time exchange rates from price oracles.
 */

export const DEMO_CONFIG = {
  // Exchange rate: How many USD equals 1 ALGO in demo mode
  USD_PER_ALGO: 100_000,
  
  // Micro conversion (1 ALGO = 1,000,000 microALGO)
  MICRO_ALGO_PER_ALGO: 1_000_000,
  
  // Whether demo mode is enabled
  DEMO_MODE: true,
}

/**
 * Convert USD to ALGO (for demo)
 * 
 * @param usdAmount - Amount in USD
 * @returns Amount in ALGO
 * 
 * @example
 * usdToAlgo(100000) // Returns: 1.0
 * usdToAlgo(50000)  // Returns: 0.5
 * usdToAlgo(250000) // Returns: 2.5
 */
export function usdToAlgo(usdAmount: number): number {
  if (!DEMO_CONFIG.DEMO_MODE) {
    // TODO: In production, use real exchange rate from oracle
    throw new Error('Production mode not implemented - integrate price oracle')
  }
  
  return usdAmount / DEMO_CONFIG.USD_PER_ALGO
}

/**
 * Convert USD to microALGO (for transactions)
 * 
 * @param usdAmount - Amount in USD
 * @returns Amount in microALGO as BigInt
 * 
 * @example
 * usdToMicroAlgo(100000) // Returns: 1000000n (1 ALGO)
 * usdToMicroAlgo(50000)  // Returns: 500000n (0.5 ALGO)
 * usdToMicroAlgo(250000) // Returns: 2500000n (2.5 ALGO)
 */
export function usdToMicroAlgo(usdAmount: number): bigint {
  const algoAmount = usdToAlgo(usdAmount)
  const microAlgo = Math.round(algoAmount * DEMO_CONFIG.MICRO_ALGO_PER_ALGO)
  return BigInt(microAlgo)
}

/**
 * Convert ALGO to USD (for display)
 * 
 * @param algoAmount - Amount in ALGO
 * @returns Amount in USD
 * 
 * @example
 * algoToUsd(1.0) // Returns: 100000
 * algoToUsd(0.5) // Returns: 50000
 * algoToUsd(2.5) // Returns: 250000
 */
export function algoToUsd(algoAmount: number): number {
  if (!DEMO_CONFIG.DEMO_MODE) {
    throw new Error('Production mode not implemented - integrate price oracle')
  }
  
  return algoAmount * DEMO_CONFIG.USD_PER_ALGO
}

/**
 * Convert microALGO to USD (for display)
 * 
 * @param microAlgoAmount - Amount in microALGO
 * @returns Amount in USD
 * 
 * @example
 * microAlgoToUsd(1000000n) // Returns: 100000
 * microAlgoToUsd(500000n)  // Returns: 50000
 */
export function microAlgoToUsd(microAlgoAmount: bigint): number {
  const algoAmount = Number(microAlgoAmount) / DEMO_CONFIG.MICRO_ALGO_PER_ALGO
  return algoToUsd(algoAmount)
}

/**
 * Format USD amount for display
 * 
 * @param amount - Amount in USD
 * @returns Formatted string
 * 
 * @example
 * formatUsd(100000) // Returns: "$100,000"
 * formatUsd(50000)  // Returns: "$50,000"
 */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format ALGO amount for display
 * 
 * @param amount - Amount in ALGO
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 * 
 * @example
 * formatAlgo(1.5)     // Returns: "1.50 ALGO"
 * formatAlgo(0.5)     // Returns: "0.50 ALGO"
 * formatAlgo(1.5, 6)  // Returns: "1.500000 ALGO"
 */
export function formatAlgo(amount: number, decimals: number = 2): string {
  return `${amount.toFixed(decimals)} ALGO`
}

/**
 * Format microALGO amount for display
 * 
 * @param microAlgo - Amount in microALGO
 * @returns Formatted string
 * 
 * @example
 * formatMicroAlgo(1500000n) // Returns: "1.50 ALGO"
 * formatMicroAlgo(500000n)  // Returns: "0.50 ALGO"
 */
export function formatMicroAlgo(microAlgo: bigint): string {
  const algo = Number(microAlgo) / DEMO_CONFIG.MICRO_ALGO_PER_ALGO
  return formatAlgo(algo)
}

/**
 * Get conversion display text for forms
 * 
 * @param usdAmount - Amount in USD
 * @returns Display string with conversion info
 * 
 * @example
 * getConversionDisplay(100000) 
 * // Returns: "≈ 1.00 ALGO\n*Demo rate: $100k USD = 1 ALGO*"
 */
export function getConversionDisplay(usdAmount: number): string {
  const algoAmount = usdToAlgo(usdAmount)
  
  if (!DEMO_CONFIG.DEMO_MODE) {
    return `≈ ${formatAlgo(algoAmount)}`
  }
  
  return `≈ ${formatAlgo(algoAmount)}\n*Demo rate: $${(DEMO_CONFIG.USD_PER_ALGO / 1000).toFixed(0)}k USD = 1 ALGO*`
}

/**
 * Calculate settlement amount with all conversions
 * Useful for form displays
 * 
 * @param cargoValueUsd - Cargo value in USD
 * @param taxRate - Tax rate as decimal (e.g., 0.05 for 5%)
 * @returns Object with all calculated amounts
 * 
 * @example
 * calculateSettlementAmount(100000, 0.05)
 * // Returns: {
 * //   usdTotal: 105000,
 * //   algoAmount: 1.05,
 * //   microAlgoAmount: 1050000n,
 * //   taxAmount: 5000,
 * //   subtotal: 100000
 * // }
 */
export function calculateSettlementAmount(cargoValueUsd: number, taxRate: number = 0): {
  usdTotal: number
  algoAmount: number
  microAlgoAmount: bigint
  taxAmount: number
  subtotal: number
} {
  const taxAmount = cargoValueUsd * taxRate
  const usdTotal = cargoValueUsd + taxAmount
  const algoAmount = usdToAlgo(usdTotal)
  const microAlgoAmount = usdToMicroAlgo(usdTotal)
  
  return {
    usdTotal,
    algoAmount,
    microAlgoAmount,
    taxAmount,
    subtotal: cargoValueUsd
  }
}

/**
 * Conversion examples for reference
 */
export const CONVERSION_EXAMPLES = {
  small: {
    usd: 50_000,
    algo: 0.5,
    microAlgo: 500_000n,
    display: '$50,000 USD = 0.5 ALGO = 500,000 microALGO'
  },
  medium: {
    usd: 100_000,
    algo: 1.0,
    microAlgo: 1_000_000n,
    display: '$100,000 USD = 1.0 ALGO = 1,000,000 microALGO'
  },
  large: {
    usd: 250_000,
    algo: 2.5,
    microAlgo: 2_500_000n,
    display: '$250,000 USD = 2.5 ALGO = 2,500,000 microALGO'
  },
  xlarge: {
    usd: 1_000_000,
    algo: 10.0,
    microAlgo: 10_000_000n,
    display: '$1,000,000 USD = 10.0 ALGO = 10,000,000 microALGO'
  }
}

// Log conversion info on import (development only)
if (DEMO_CONFIG.DEMO_MODE && typeof window !== 'undefined') {
  console.log('💱 Demo Currency Converter Loaded')
  console.log(`   Exchange Rate: $${DEMO_CONFIG.USD_PER_ALGO.toLocaleString()} USD = 1 ALGO`)
  console.log('\n📊 Conversion Examples:')
  console.log(`   ${CONVERSION_EXAMPLES.small.display}`)
  console.log(`   ${CONVERSION_EXAMPLES.medium.display}`)
  console.log(`   ${CONVERSION_EXAMPLES.large.display}`)
  console.log(`   ${CONVERSION_EXAMPLES.xlarge.display}`)
  console.log('\n💡 Use usdToMicroAlgo() for transaction amounts')
}
