/**
 * Call Initialize on Existing V5 Contract
 * Using the typed client that worked for deployment
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV5Client } from '../smart_contracts/artifacts/atomic_marketplace_escrow_v5/AtomicMarketplaceEscrowV5Client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.testnet') })

const APP_ID = 746822940

async function initializeExisting() {
  console.log('====================================')
  console.log('⚙️  Initialize Existing V5 Contract')
  console.log('====================================')
  console.log(`📍 App ID: ${APP_ID}`)
  console.log('')
  
  try {
    const algorand = AlgorandClient.testNet()
    
    const deployerMnemonic = process.env.DEPLOYER_MNEMONIC
    if (!deployerMnemonic) {
      throw new Error('DEPLOYER_MNEMONIC not found')
    }
    
    const deployer = algorand.account.fromMnemonic(deployerMnemonic)
    
    console.log(`📝 Deployer: ${deployer.addr}`)
    console.log('')
    
    // Create typed client for existing app - APP_ID is already a number
    const appClient = new AtomicMarketplaceEscrowV5Client(
      {
        resolveBy: 'id',
        id: APP_ID, // Use number directly, not BigInt
        sender: deployer,
      },
      algorand.client.algod
    )
    
    const treasuryAddress = String(deployer.addr) // Convert to string
    const settlementAssetId = 0 // ALGO
    
    console.log(`💵 Settlement: ALGO (0)`)
    console.log(`💰 Treasury: ${treasuryAddress}`)
    console.log('')
    console.log('⚙️  Calling initialize...')
    
    // Call initialize using typed client
    const result = await appClient.initialize({
      settlementAssetId: BigInt(settlementAssetId),
      treasuryAddress: treasuryAddress,
    })
    
    console.log('✅ Initialized!')
    console.log(`📍 Txn ID: ${result.txIds[0]}`)
    console.log('')
    
    // Verify
    console.log('🔍 Verifying...')
    const appInfo = await algorand.client.algod.getApplicationByID(APP_ID).do()
    const globalState = appInfo.params['global-state'] || []
    
    console.log('Global State:')
    for (const item of globalState) {
      const key = Buffer.from(item.key, 'base64').toString('utf8')
      let value
      if (item.value.type === 1) {
        const bytes = Buffer.from(item.value.bytes, 'base64')
        const algosdk = require('algosdk')
        value = algosdk.encodeAddress(bytes)
      } else {
        value = item.value.uint
      }
      console.log(`  ${key}: ${value}`)
    }
    
    console.log('')
    console.log('🎉 V5 Ready!')
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
    
    // Check if it's the "already initialized" error
    if (error.message && error.message.includes('assert failed')) {
      console.error('')
      console.error('⚠️  Contract already initialized or cannot be re-initialized')
      console.error('   The contract has a guard preventing multiple initializations')
      console.error('')
      console.error('Options:')
      console.error('1. Deploy a NEW V5 contract (recommended)')
      console.error('2. Manually query trades without relying on nextTradeId')
    }
    
    throw error
  }
}

initializeExisting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
