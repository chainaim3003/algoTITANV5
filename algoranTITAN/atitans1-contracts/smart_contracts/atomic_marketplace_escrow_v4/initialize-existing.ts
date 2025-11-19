/**
 * Initialize AtomicMarketplaceEscrowV4 Contract
 * 
 * Run this script to initialize an already deployed contract
 * App ID: 746780258
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from '../artifacts/atomic_marketplace_escrow_v4/AtomicMarketplaceEscrowV4Client'

const V4_ESCROW_APP_ID = 746780258

// USDCa on TestNet
const USDC_ASSET_ID = 10458941

// Your treasury address (or use deployer as treasury)
const TREASURY_ADDRESS = 'YOUR_TREASURY_ADDRESS_OR_LEAVE_DEFAULT'

async function initializeContract() {
  console.log('⚙️  Initializing AtomicMarketplaceEscrowV4...')
  console.log(`   App ID: ${V4_ESCROW_APP_ID}`)
  
  // Initialize Algorand client for TestNet
  const algorand = AlgorandClient.testNet()
  
  // Get your account (you'll need to provide mnemonic)
  // Option 1: From environment variable
  // Option 2: Paste your mnemonic directly (NOT RECOMMENDED for production)
  
  const mnemonic = process.env.DEPLOYER_MNEMONIC || 'YOUR_MNEMONIC_HERE'
  
  if (mnemonic === 'YOUR_MNEMONIC_HERE') {
    console.error('❌ Please set DEPLOYER_MNEMONIC environment variable or update the script')
    console.log('   export DEPLOYER_MNEMONIC="your 25 word mnemonic phrase here"')
    process.exit(1)
  }
  
  const deployer = algorand.account.fromMnemonic(mnemonic)
  console.log(`📝 Sender: ${deployer.addr}`)
  
  // Get typed client for existing app
  const appClient = algorand.client.getTypedAppClientById(AtomicMarketplaceEscrowV4Client, {
    appId: BigInt(V4_ESCROW_APP_ID),
    defaultSender: deployer.addr,
  })
  
  // Determine treasury address
  const treasuryAddr = TREASURY_ADDRESS !== 'YOUR_TREASURY_ADDRESS_OR_LEAVE_DEFAULT'
    ? TREASURY_ADDRESS
    : deployer.addr
  
  console.log(`   Treasury: ${treasuryAddr}`)
  console.log(`   USDCa Asset: ${USDC_ASSET_ID}`)
  
  try {
    // Call initialize method
    console.log('\n🔄 Calling initialize...')
    
    const result = await appClient.send.initialize({
      args: [
        BigInt(USDC_ASSET_ID),
        treasuryAddr,
      ],
    })
    
    console.log('✅ Contract initialized successfully!')
    console.log(`   Transaction ID: ${result.txIds[0]}`)
    console.log(`   Explorer: https://testnet.algoexplorer.io/tx/${result.txIds[0]}`)
    
    // Check global state
    console.log('\n📊 Checking global state...')
    const algodClient = algorand.client.algod
    const appInfo = await algodClient.getApplicationByID(V4_ESCROW_APP_ID).do()
    
    console.log('Global State:')
    appInfo.params.globalState?.forEach((item: any) => {
      const key = Buffer.from(item.key, 'base64').toString()
      const value = item.value.type === 1 
        ? Buffer.from(item.value.bytes, 'base64').toString()
        : item.value.uint
      console.log(`   ${key}: ${value}`)
    })
    
    console.log('\n✅ Initialization complete! You can now create trades.')
    
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Contract is already initialized')
      console.log('   This is fine - you can proceed to create trades')
    } else {
      console.error('❌ Initialization failed:', error.message || error)
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
