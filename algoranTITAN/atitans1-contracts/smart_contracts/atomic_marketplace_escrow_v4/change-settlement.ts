/**
 * Change Settlement Currency for AtomicMarketplaceEscrowV4
 * 
 * Allows creator to change the settlement currency after initialization
 * App ID: 746780258
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from '../artifacts/atomic_marketplace_escrow_v4/AtomicMarketplaceEscrowV4Client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.testnet
dotenv.config({ path: path.resolve(__dirname, '../../.env.testnet') })

const V4_ESCROW_APP_ID = 746780258

// ============================================
// CONFIGURATION: Choose your settlement currency
// ============================================

// Settlement Currency Options:
// - 0 = ALGO (native Algorand)
// - 10458941 = USDCa on TestNet
// - Any other ASA ID you want to use

const NEW_SETTLEMENT_CURRENCY = 10458941  // Change this to your desired asset

// ============================================

async function changeSettlementCurrency() {
  console.log('🔄 Changing Settlement Currency...')
  console.log(`   App ID: ${V4_ESCROW_APP_ID}`)
  
  // Get mnemonic from environment
  const mnemonic = process.env.DEPLOYER_MNEMONIC
  
  if (!mnemonic) {
    console.error('❌ DEPLOYER_MNEMONIC not found in .env.testnet')
    console.log('   Only the contract creator can change settlement currency')
    process.exit(1)
  }
  
  // Initialize Algorand client
  const algorand = AlgorandClient.testNet()
  
  // Get creator account
  const creator = algorand.account.fromMnemonic(mnemonic)
  console.log(`📝 Creator: ${creator.addr}`)
  
  // Get typed client
  const appClient = algorand.client.getTypedAppClientById(AtomicMarketplaceEscrowV4Client, {
    appId: BigInt(V4_ESCROW_APP_ID),
    defaultSender: creator.addr,
  })
  
  // Show current state
  console.log('\n📊 Current State:')
  const algodClient = algorand.client.algod
  const appInfo = await algodClient.getApplicationByID(V4_ESCROW_APP_ID).do()
  
  const currentCurrency = appInfo.params.globalState?.find((item: any) => {
    const key = Buffer.from(item.key, 'base64').toString()
    return key === 'settlementCurrency'
  })
  
  const currentValue = currentCurrency?.value.uint || 0
  const currentName = currentValue === 0 ? 'ALGO (native)' : `Asset ID ${currentValue}`
  console.log(`   Current Settlement: ${currentName}`)
  
  const newName = NEW_SETTLEMENT_CURRENCY === 0 
    ? 'ALGO (native)' 
    : `Asset ID ${NEW_SETTLEMENT_CURRENCY}`
  console.log(`   New Settlement: ${newName}`)
  
  if (currentValue === NEW_SETTLEMENT_CURRENCY) {
    console.log('\n✅ Already set to the desired currency!')
    process.exit(0)
  }
  
  // Confirm change
  console.log('\n⚠️  This will change how all NEW trades settle!')
  console.log('   Existing trades will continue with their original currency.')
  
  try {
    console.log('\n🔄 Updating settlement currency...')
    
    const result = await appClient.send.setSettlementCurrency({
      args: [BigInt(NEW_SETTLEMENT_CURRENCY)],
    })
    
    console.log('✅ Settlement currency updated!')
    console.log(`   Transaction ID: ${result.txIds[0]}`)
    console.log(`   Explorer: https://testnet.algoexplorer.io/tx/${result.txIds[0]}`)
    
    // Verify change
    console.log('\n📊 Verifying change...')
    const updatedAppInfo = await algodClient.getApplicationByID(V4_ESCROW_APP_ID).do()
    
    const updatedCurrency = updatedAppInfo.params.globalState?.find((item: any) => {
      const key = Buffer.from(item.key, 'base64').toString()
      return key === 'settlementCurrency'
    })
    
    const updatedValue = updatedCurrency?.value.uint || 0
    const updatedName = updatedValue === 0 ? 'ALGO (native)' : `Asset ID ${updatedValue}`
    
    console.log(`   Settlement Currency: ${updatedName}`)
    console.log('\n✅ All new trades will now use:', updatedName)
    
  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
    
    if (error.message?.includes('Only creator')) {
      console.log('\n⚠️  Only the contract creator can change settlement currency')
      console.log('   Make sure you are using the creator account mnemonic')
    }
    throw error
  }
}

// Run script
changeSettlementCurrency()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
