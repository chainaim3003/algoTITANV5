import * as dotenv from 'dotenv'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceV3Client } from './smart_contracts/artifacts/atomic_marketplace_v3/AtomicMarketplaceV3Client'
import algosdk from 'algosdk'

// Load TestNet environment variables
dotenv.config({ path: '.env.testnet' })

const APP_ID = 746657437n // Your marketplace app ID
const OFFICIAL_TESTNET_USDC = 10458941n
const CUSTOM_TEST_USDC = 746654280n

async function initializeMarketplace() {
  console.log('====================================')
  console.log('🔧 Initializing Marketplace App:', APP_ID.toString())
  console.log('====================================')

  // Create Algorand client for TestNet
  const algorand = AlgorandClient.testNet()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  // Create typed app client  
  const appClient = algorand.client.getTypedAppClientById(AtomicMarketplaceV3Client, {
    appId: APP_ID,
    defaultSender: deployer.addr,
  })

  try {
    // Get app address from app ID using algosdk
    const appAddress = algosdk.getApplicationAddress(Number(APP_ID))
    console.log(`📍 App Address: ${appAddress}`)
    
    // Step 1: Fund the app account first
    console.log('💰 Funding app account (0.5 ALGO for box storage)...')
    await algorand.send.payment({
      amount: (0.5).algo(),
      sender: deployer.addr,
      receiver: appAddress,
    })
    console.log('✅ App account funded')

    // Step 2: Initialize with official USDC
    console.log(`🔧 Initializing with official USDC: ${OFFICIAL_TESTNET_USDC}...`)
    await appClient.send.initialize({
      args: [OFFICIAL_TESTNET_USDC],
    })
    console.log('✅ Marketplace initialized with official USDC')

    // Step 3: Add custom USDC
    console.log(`🔧 Adding custom USDC: ${CUSTOM_TEST_USDC}...`)
    try {
      await appClient.send.addPaymentAsset({
        args: [CUSTOM_TEST_USDC],
      })
      console.log('✅ Custom USDC added')
    } catch (error) {
      console.log(`⚠️  Custom USDC error (may not exist): ${(error as Error).message}`)
    }

    // Step 4: Add more operational funds
    console.log('💰 Adding operational funds (0.5 ALGO)...')
    await algorand.send.payment({
      amount: (0.5).algo(),
      sender: deployer.addr,
      receiver: appAddress,
    })
    console.log('✅ Total funding: 1 ALGO')

    console.log('\n====================================')
    console.log('✅ MARKETPLACE INITIALIZATION COMPLETE!')
    console.log('====================================')
    console.log(`📍 App ID: ${APP_ID}`)
    console.log(`📍 App Address: ${appAddress}`)
    console.log(`💵 Accepted Payment Assets:`)
    console.log(`   - Default: Official USDC (${OFFICIAL_TESTNET_USDC})`)
    console.log(`   - Optional: Custom USDC (${CUSTOM_TEST_USDC})`)
    console.log(`   - ALGO (native)`)
    console.log(`\n🎉 Marketplace ready for Lute wallet!`)

  } catch (error) {
    console.error('❌ Error:', (error as Error).message)
    console.error('Full error:', error)
    throw error
  }
}

initializeMarketplace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
