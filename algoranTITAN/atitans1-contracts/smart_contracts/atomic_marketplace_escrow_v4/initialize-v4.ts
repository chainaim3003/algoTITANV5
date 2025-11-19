/**
 * Initialize AtomicMarketplaceEscrowV4 Contract
 * 
 * Uses the mnemonic from .env.testnet file
 * App ID: 746780258
 * 
 * CONFIGURATION:
 * - Settlement Currency: ALGO (0) by default - can be changed later
 * - Treasury: Deployer address by default - can be customized below
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from '../artifacts/atomic_marketplace_escrow_v4/AtomicMarketplaceEscrowV4Client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.testnet
dotenv.config({ path: path.resolve(__dirname, '../../.env.testnet') })

const V4_ESCROW_APP_ID = 746780258

// ============================================
// CONFIGURATION
// ============================================

// Settlement Currency:
// - 0 = ALGO (native Algorand, recommended for simplicity)
// - 10458941 = USDCa on TestNet
// - Any other ASA ID
const SETTLEMENT_CURRENCY = 0  // ALGO by default

// Treasury Address (where platform fees go):
// - Set to specific address, OR
// - Leave null to use deployer address
const TREASURY_ADDRESS: string | null = null  // null = use deployer address

// ============================================

async function initializeContract() {
  console.log('⚙️  Initializing AtomicMarketplaceEscrowV4...')
  console.log(`   App ID: ${V4_ESCROW_APP_ID}`)
  
  // Get mnemonic from environment
  const mnemonic = process.env.DEPLOYER_MNEMONIC
  
  if (!mnemonic) {
    console.error('❌ DEPLOYER_MNEMONIC not found in .env.testnet')
    process.exit(1)
  }
  
  // Initialize Algorand client for TestNet
  const algorand = AlgorandClient.testNet()
  
  // Get deployer account from mnemonic
  const deployer = algorand.account.fromMnemonic(mnemonic)
  console.log(`📝 Deployer: ${deployer.addr}`)
  
  // Check deployer balance
  const accountInfo = await algorand.client.algod.accountInformation(deployer.addr).do()
  const balance = accountInfo.amount / 1_000_000
  console.log(`💰 Balance: ${balance} ALGO`)
  
  if (balance < 0.1) {
    console.warn('⚠️  Low balance! You may need more ALGO for transactions.')
  }
  
  // Determine treasury address
  const treasuryAddr = TREASURY_ADDRESS || deployer.addr
  
  // Determine settlement currency name
  const settlementName = SETTLEMENT_CURRENCY === 0 
    ? 'ALGO (native)' 
    : `Asset ID ${SETTLEMENT_CURRENCY}`
  
  console.log(`\n📋 Configuration:`)
  console.log(`   Treasury: ${treasuryAddr}`)
  console.log(`   Settlement Currency: ${settlementName}`)
  
  // Get typed client for existing app
  const appClient = algorand.client.getTypedAppClientById(AtomicMarketplaceEscrowV4Client, {
    appId: BigInt(V4_ESCROW_APP_ID),
    defaultSender: deployer.addr,
  })
  
  try {
    // Check if already initialized
    console.log('\n🔍 Checking current state...')
    const algodClient = algorand.client.algod
    const appInfo = await algodClient.getApplicationByID(V4_ESCROW_APP_ID).do()
    
    const globalState = appInfo.params.globalState || []
    const isInitialized = globalState.some((item: any) => {
      const key = Buffer.from(item.key, 'base64').toString()
      return key === 'nextTradeId'
    })
    
    if (isInitialized) {
      console.log('✅ Contract is already initialized!')
      console.log('\nCurrent Global State:')
      globalState.forEach((item: any) => {
        const key = Buffer.from(item.key, 'base64').toString()
        let value: any = item.value.uint
        if (item.value.type === 1) {
          const addr = Buffer.from(item.value.bytes, 'base64')
          value = algosdk.encodeAddress(new Uint8Array(addr))
        }
        
        // Format specific keys
        if (key === 'settlementCurrency') {
          value = value === 0 ? '0 (ALGO)' : value
        }
        
        console.log(`   ${key}: ${value}`)
      })
      console.log('\n💡 To change settlement currency, run: npm run change-settlement')
      console.log('✅ You can now create trades!')
      return
    }
    
    // Call initialize method
    console.log('\n🔄 Initializing contract...')
    
    const result = await appClient.send.initialize({
      args: [
        BigInt(SETTLEMENT_CURRENCY),  // 0 = ALGO
        treasuryAddr,
      ],
    })
    
    console.log('✅ Contract initialized successfully!')
    console.log(`   Transaction ID: ${result.txIds[0]}`)
    console.log(`   Explorer: https://testnet.algoexplorer.io/tx/${result.txIds[0]}`)
    
    // Check global state after initialization
    console.log('\n📊 Verifying initialization...')
    const updatedAppInfo = await algodClient.getApplicationByID(V4_ESCROW_APP_ID).do()
    
    console.log('Global State:')
    updatedAppInfo.params.globalState?.forEach((item: any) => {
      const key = Buffer.from(item.key, 'base64').toString()
      let value: any = item.value.uint
      if (item.value.type === 1) {
        const addr = Buffer.from(item.value.bytes, 'base64')
        const algosdk = require('algosdk')
        value = algosdk.encodeAddress(new Uint8Array(addr))
      }
      
      // Format specific keys
      if (key === 'settlementCurrency') {
        value = value === 0 ? '0 (ALGO)' : value
      } else if (key === 'regulatorTaxRate') {
        value = `${value} (${value/100}%)`
      } else if (key === 'regulatorRefundRate') {
        value = `${value} (${value/100}%)`
      } else if (key === 'marketplaceFeeRate') {
        value = `${value} (${value/100}%)`
      }
      
      console.log(`   ${key}: ${value}`)
    })
    
    console.log('\n✅ Initialization complete!')
    console.log('\n💡 Settlement Currency Info:')
    console.log('   - Currently set to:', settlementName)
    console.log('   - Trades will use', SETTLEMENT_CURRENCY === 0 ? 'ALGO' : 'the specified asset')
    console.log('   - To change later, run: npm run change-settlement')
    console.log('\n🎉 You can now create trades!')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
    
    if (error.message?.includes('already exists') || error.message?.includes('initialized')) {
      console.log('\nℹ️  Contract may already be initialized. Checking state...')
      const algodClient = algorand.client.algod
      const appInfo = await algodClient.getApplicationByID(V4_ESCROW_APP_ID).do()
      
      if (appInfo.params.globalState && appInfo.params.globalState.length > 0) {
        console.log('Global State:')
        appInfo.params.globalState.forEach((item: any) => {
          const key = Buffer.from(item.key, 'base64').toString()
          const value = item.value.type === 1 
            ? Buffer.from(item.value.bytes, 'base64').toString()
            : item.value.uint
          console.log(`   ${key}: ${value}`)
        })
        console.log('\n✅ Contract is initialized. You can create trades!')
      }
    } else {
      throw error
    }
  }
}

// Run initialization
initializeContract()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
