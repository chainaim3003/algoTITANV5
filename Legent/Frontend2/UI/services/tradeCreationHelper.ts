/**
 * Trade Creation Helper
 * 
 * CRITICAL: This file shows the CORRECT way to create trades with proper USD to microALGO conversion
 * Always use this pattern when creating trades to avoid amount errors
 */

import { usdToMicroAlgo, formatUsd, formatAlgo, usdToAlgo, formatMicroAlgo } from '../utils/demoCurrencyConverter'
import { escrowV5Service } from '../services/escrowV5Service'

export interface CreateTradeParams {
  cargoValueUsd: number  // ✅ Always pass USD value here
  sellerAddress: string
  buyerAddress: string
  productType: string
  description: string
  ipfsHash: string
  signer: any
}

/**
 * Create a trade listing with CORRECT USD to microALGO conversion
 * 
 * This is the ONLY correct way to create trades. Any other method that doesn't
 * use usdToMicroAlgo() will result in incorrect amounts being stored on the blockchain.
 * 
 * @example
 * // User enters $100,000 USD in a form
 * await createTradeWithCorrectConversion({
 *   cargoValueUsd: 100000,  // This will be converted to 1,000,000 microALGO (1 ALGO)
 *   sellerAddress: '...',
 *   buyerAddress: '...',
 *   productType: 'eBL',
 *   description: 'Electronics shipment',
 *   ipfsHash: 'Qm...',
 *   signer: signTransactions
 * })
 */
export async function createTradeWithCorrectConversion(params: CreateTradeParams) {
  const {
    cargoValueUsd,
    sellerAddress,
    buyerAddress,
    productType,
    description,
    ipfsHash,
    signer
  } = params

  // ✅ CRITICAL: Convert USD to microALGO using the demo rate
  const settlementMicroAlgo = usdToMicroAlgo(cargoValueUsd)
  
  // Log the conversion for verification
  console.log('═══════════════════════════════════════════════════')
  console.log('📝 Creating Trade with CORRECT Conversion')
  console.log('═══════════════════════════════════════════════════')
  console.log(`Input (USD):              ${formatUsd(cargoValueUsd)}`)
  console.log(`Converted (ALGO):         ${formatAlgo(usdToAlgo(cargoValueUsd))}`)
  console.log(`Settlement (microALGO):   ${settlementMicroAlgo.toString()}`)
  console.log(`Demo Rate:                $100,000 USD = 1 ALGO`)
  console.log('═══════════════════════════════════════════════════')

  try {
    // ✅ Pass the CONVERTED microALGO amount to the service
    const result = await escrowV5Service.createTradeListing({
      sellerAddress,
      amount: Number(settlementMicroAlgo), // ✅ This is in microALGO!
      productType,
      description,
      ipfsHash,
      senderAddress: buyerAddress,
      signer
    })

    console.log('✅ Trade created successfully!')
    console.log(`   Trade ID: ${result.tradeId}`)
    console.log(`   Transaction ID: ${result.txId}`)
    console.log(`   Explorer: ${result.explorerUrl}`)
    console.log('')
    console.log('💡 Verification:')
    console.log(`   Stored amount: ${settlementMicroAlgo.toString()} microALGO`)
    console.log(`   Display as: ${formatMicroAlgo(settlementMicroAlgo)}`)
    console.log(`   Display as USD: ${formatUsd(cargoValueUsd)}`)
    console.log('═══════════════════════════════════════════════════')

    return result
  } catch (error) {
    console.error('❌ Failed to create trade:', error)
    throw error
  }
}

/**
 * ❌ WRONG WAY - DO NOT USE THIS!
 * 
 * This shows the INCORRECT way that causes the $10 billion problem
 */
export async function createTradeWrongWay_DONOTUSE(params: CreateTradeParams) {
  console.error('⚠️⚠️⚠️ WARNING: Using WRONG trade creation method! ⚠️⚠️⚠️')
  console.error('This will result in incorrect amounts!')
  
  // ❌ WRONG: Passing USD value directly as microALGO
  const result = await escrowV5Service.createTradeListing({
    sellerAddress: params.sellerAddress,
    amount: params.cargoValueUsd, // ❌ This is USD, not microALGO!
    productType: params.productType,
    description: params.description,
    ipfsHash: params.ipfsHash,
    senderAddress: params.buyerAddress,
    signer: params.signer
  })

  return result
}

/**
 * Example: How to use in a React component
 * 
 * ```typescript
 * // In your component:
 * const handleCreateTrade = async () => {
 *   const tradeParams = {
 *     cargoValueUsd: 100000,  // ✅ Pass USD value
 *     sellerAddress: 'EXPORTER_ADDRESS',
 *     buyerAddress: activeAddress,
 *     productType: 'eBL',
 *     description: 'Electronics shipment',
 *     ipfsHash: 'QmYourIPFSHash...',
 *     signer: signTransactions
 *   }
 *   
 *   // ✅ Use the correct creation function
 *   const result = await createTradeWithCorrectConversion(tradeParams)
 *   alert(`Trade created! ID: ${result.tradeId}`)
 * }
 * ```
 */

/**
 * Testing utilities
 */
export const tradeConversionTests = {
  /**
   * Test the conversion for common cargo values
   */
  runTests() {
    console.log('\n🧪 Testing Trade Amount Conversions')
    console.log('═'.repeat(60))
    
    const testCases = [
      { usd: 50000, expectedAlgo: 0.5, expectedMicroAlgo: 500000 },
      { usd: 100000, expectedAlgo: 1.0, expectedMicroAlgo: 1000000 },
      { usd: 250000, expectedAlgo: 2.5, expectedMicroAlgo: 2500000 },
      { usd: 1000000, expectedAlgo: 10.0, expectedMicroAlgo: 10000000 },
    ]

    for (const test of testCases) {
      const microAlgo = usdToMicroAlgo(test.usd)
      const algo = usdToAlgo(test.usd)
      
      const microAlgoMatch = Number(microAlgo) === test.expectedMicroAlgo
      const algoMatch = algo === test.expectedAlgo
      
      console.log(`\nTest: ${formatUsd(test.usd)}`)
      console.log(`  Expected: ${test.expectedAlgo} ALGO (${test.expectedMicroAlgo} microALGO)`)
      console.log(`  Got:      ${algo} ALGO (${microAlgo.toString()} microALGO)`)
      console.log(`  Result:   ${microAlgoMatch && algoMatch ? '✅ PASS' : '❌ FAIL'}`)
    }
    
    console.log('\n' + '═'.repeat(60))
  },

  /**
   * Verify a specific trade amount
   */
  verifyAmount(cargoValueUsd: number) {
    const microAlgo = usdToMicroAlgo(cargoValueUsd)
    const algo = usdToAlgo(cargoValueUsd)
    
    console.log('\n💰 Amount Verification')
    console.log('─'.repeat(50))
    console.log(`Input:      ${formatUsd(cargoValueUsd)}`)
    console.log(`ALGO:       ${formatAlgo(algo)}`)
    console.log(`microALGO:  ${microAlgo.toString()}`)
    console.log(`Rate:       $100,000 USD = 1 ALGO`)
    console.log('─'.repeat(50))
    
    return {
      usd: cargoValueUsd,
      algo,
      microAlgo
    }
  }
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).tradeHelper = {
    createTrade: createTradeWithCorrectConversion,
    test: tradeConversionTests,
    verify: tradeConversionTests.verifyAmount
  }
  
  console.log('💡 Trade Helper loaded! Available in console:')
  console.log('   window.tradeHelper.test.runTests()')
  console.log('   window.tradeHelper.verify(100000)')
}
