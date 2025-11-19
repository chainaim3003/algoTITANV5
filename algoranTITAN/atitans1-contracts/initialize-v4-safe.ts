import * as dotenv from 'dotenv'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from './smart_contracts/artifacts/atomic_marketplace_escrow_v4/AtomicMarketplaceEscrowV4Client'
import algosdk from 'algosdk'

// Load TestNet environment variables
dotenv.config({ path: '.env.testnet' })

// V4 Contract App ID from deployment
const V4_APP_ID = 746780258n
const OFFICIAL_TESTNET_USDC = 10458941n // Official USDC on TestNet
const USE_ALGO = 0n // 0 means use ALGO, otherwise use ASA ID

async function checkAccountBalance(algorand: AlgorandClient, address: string): Promise<void> {
  const accountInfo = await algorand.client.algod.accountInformation(address).do()
  
  // Convert to numbers properly to avoid BigInt mixing
  const balanceInMicroAlgo = Number(accountInfo.amount)
  const minBalanceInMicroAlgo = Number(accountInfo['min-balance'])
  
  const balanceInAlgo = balanceInMicroAlgo / 1_000_000
  const minBalanceInAlgo = minBalanceInMicroAlgo / 1_000_000
  const availableBalance = balanceInAlgo - minBalanceInAlgo
  const numAssets = accountInfo.assets?.length || 0

  console.log('\n💰 Account Balance Check:')
  console.log(`   Total Balance: ${balanceInAlgo.toFixed(6)} ALGO`)
  console.log(`   Minimum Balance: ${minBalanceInAlgo.toFixed(6)} ALGO (${numAssets} assets held)`)
  console.log(`   Available to Spend: ${availableBalance.toFixed(6)} ALGO`)
  
  const requiredForTransaction = 2.0 // ALGO to send
  const requiredTotal = requiredForTransaction + 0.1 // Add buffer for fees

  if (availableBalance < requiredTotal) {
    console.error(`\n❌ INSUFFICIENT FUNDS!`)
    console.error(`   Need at least: ${requiredTotal.toFixed(6)} ALGO available`)
    console.error(`   Currently have: ${availableBalance.toFixed(6)} ALGO available`)
    console.error(`   Shortfall: ${(requiredTotal - availableBalance).toFixed(6)} ALGO`)
    console.error(`\n💡 To fix this, fund your account with testnet ALGO:`)
    console.error(`   1. Go to: https://bank.testnet.algorand.network/`)
    console.error(`   2. Enter your address: ${address}`)
    console.error(`   3. Request testnet ALGO (you'll get 10 ALGO)`)
    throw new Error('Insufficient balance to proceed')
  }

  console.log(`✅ Sufficient balance to proceed!`)
}

async function initializeV4Marketplace() {
  console.log('====================================')
  console.log('🔧 Initializing V4 Marketplace App:', V4_APP_ID.toString())
  console.log('====================================')

  // Create Algorand client for TestNet
  const algorand = AlgorandClient.testNet()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  console.log(`📍 Deployer Address: ${deployer.addr}`)

  // Check balance before proceeding
  await checkAccountBalance(algorand, deployer.addr)

  // Create typed app client  
  const appClient = algorand.client.getTypedAppClientById(AtomicMarketplaceEscrowV4Client, {
    appId: V4_APP_ID,
    defaultSender: deployer.addr,
  })

  try {
    // Get app address from app ID
    const appAddress = algosdk.getApplicationAddress(Number(V4_APP_ID))
    console.log(`\n📍 App Address: ${appAddress}`)
    
    // Step 1: Fund the app account for box storage
    console.log('\n💰 Funding app account (2 ALGO for box storage)...')
    await algorand.send.payment({
      amount: (2).algo(),
      sender: deployer.addr,
      receiver: appAddress,
    })
    console.log('✅ App account funded with 2 ALGO')

    // Step 2: Initialize the contract
    // settlementAssetId: 0 for ALGO, or USDC ASA ID
    // treasuryAddress: Platform treasury (deployer for now)
    const settlementAssetId = USE_ALGO // Use ALGO for settlement
    const treasuryAddress = deployer.addr

    console.log(`\n🔧 Initializing contract...`)
    console.log(`   Settlement Currency: ${settlementAssetId === 0n ? 'ALGO' : `ASA ${settlementAssetId}`}`)
    console.log(`   Treasury Address: ${treasuryAddress}`)
    
    const initResult = await appClient.send.initialize({
      args: [settlementAssetId, treasuryAddress],
      // Increase box ref budget for initialization
      staticFee: (2_000).microAlgo(), // Higher fee for box storage
      sendParams: {
        populateAppCallResources: true,
      }
    })

    console.log('✅ Contract initialized successfully!')
    console.log(`   Transaction ID: ${initResult.txIds[0]}`)
    
    // Step 3: Verify initialization by checking global state
    console.log('\n🔍 Verifying initialization...')
    const appInfo = await algorand.client.algod.getApplicationByID(Number(V4_APP_ID)).do()
    const globalState = appInfo.params['global-state'] || []
    
    console.log('Global State:')
    for (const item of globalState) {
      const key = Buffer.from(item.key, 'base64').toString()
      const value = item.value
      
      if (value.type === 1) { // bytes
        console.log(`   ${key}: ${Buffer.from(value.bytes, 'base64').toString('hex')}`)
      } else { // uint
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
    console.error('\n❌ Error:', (error as Error).message)
    if ((error as any).response) {
      console.error('Response details:', (error as any).response)
    }
    throw error
  }
}

initializeV4Marketplace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
