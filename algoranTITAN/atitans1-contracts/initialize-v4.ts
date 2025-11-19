import * as dotenv from 'dotenv'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client, APP_SPEC } from './smart_contracts/artifacts/atomic_marketplace_escrow_v4/AtomicMarketplaceEscrowV4Client'
import algosdk from 'algosdk'

// Load TestNet environment variables
dotenv.config({ path: '.env.testnet' })

// V4 Contract App ID from deployment
const V4_APP_ID = 746780258
const USE_ALGO = 0

async function initializeV4Marketplace() {
  console.log('====================================')
  console.log('🔧 Initializing V4 Marketplace App:', V4_APP_ID.toString())
  console.log('====================================')

  const algorand = AlgorandClient.testNet()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  // ✅ FIX: Ensure we have the address as a string
  const deployerAddress = typeof deployer.addr === 'string' ? deployer.addr : deployer.addr.toString()
  
  console.log(`📍 Deployer Address: ${deployerAddress}`)

  try {
    const appAddress = algosdk.getApplicationAddress(V4_APP_ID)
    console.log(`📍 App Address: ${appAddress}`)
    
    // Step 1: Fund the app account for box storage
    console.log('💰 Funding app account (2 ALGO for box storage)...')
    await algorand.send.payment({
      amount: (2).algo(),
      sender: deployerAddress,
      receiver: appAddress,
    })
    console.log('✅ App account funded with 2 ALGO')

    // Step 2: Initialize the contract
    const settlementAssetId = BigInt(USE_ALGO)
    
    console.log(`🔧 Initializing contract...`)
    console.log(`   Settlement Currency: ${settlementAssetId === 0n ? 'ALGO' : `ASA ${settlementAssetId}`}`)
    console.log(`   Treasury Address: ${deployerAddress}`)
    
    // Create ABIContract instance
    const contract = new algosdk.ABIContract(APP_SPEC)
    const initMethod = contract.getMethodByName('initialize')
    
    console.log(`   Method signature: ${initMethod.getSignature()}`)
    
    // ✅ Pass the address as a string - the ABI encoder will handle the conversion
    const initResult = await algorand.send.appCallMethodCall({
      appId: BigInt(V4_APP_ID),
      method: initMethod,
      args: [settlementAssetId, deployerAddress], // ✅ Pass string address directly
      sender: deployerAddress,
      signer: deployer,
    })

    console.log('✅ Contract initialized successfully!')
    console.log(`   Transaction ID: ${initResult.txIds[0]}`)
    
    // Step 3: Verify initialization
    console.log('\n🔍 Verifying initialization...')
    const appInfo = await algorand.client.algod.getApplicationByID(V4_APP_ID).do()
    const globalState = appInfo.params['global-state'] || []
    
    console.log('Global State:')
    for (const item of globalState) {
      const key = Buffer.from(item.key, 'base64').toString()
      const value = item.value
      
      if (value.type === 1) {
        console.log(`   ${key}: ${Buffer.from(value.bytes, 'base64').toString('hex')}`)
      } else {
        console.log(`   ${key}: ${value.uint}`)
      }
    }

    console.log('\n====================================')
    console.log('✅ V4 MARKETPLACE INITIALIZATION COMPLETE!')
    console.log('====================================')
    console.log(`📍 App ID: ${V4_APP_ID}`)
    console.log(`📍 App Address: ${appAddress}`)
    console.log(`💵 Settlement Currency: ${settlementAssetId === 0n ? 'ALGO' : `ASA ${settlementAssetId}`}`)
    console.log(`📋 Rates:`)
    console.log(`   - Regulator Tax: 5.00%`)
    console.log(`   - Regulator Refund: 2.00%`)
    console.log(`   - Marketplace Fee: 0.25%`)
    console.log(`\n🎉 V4 Marketplace is ready for trades!`)

  } catch (error) {
    console.error('❌ Error:', (error as Error).message)
    console.error('Full error:', error)
    throw error
  }
}

initializeV4Marketplace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })