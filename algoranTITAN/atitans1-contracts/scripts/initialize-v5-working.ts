/**
 * Initialize V5 Contract - Using AlgoKit Best Practices
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as algosdk from 'algosdk'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.testnet') })

const APP_ID = 746822940

async function initializeContract() {
  console.log('====================================')
  console.log('🔧 Initializing V5 Contract')
  console.log('====================================')
  console.log('')
  
  try {
    const algorand = AlgorandClient.testNet()
    
    const deployerMnemonic = process.env.DEPLOYER_MNEMONIC
    if (!deployerMnemonic) {
      throw new Error('DEPLOYER_MNEMONIC not found')
    }
    
    // Get the deployer account using AlgoKit - this returns a TransactionSignerAccount
    const deployer = algorand.account.fromMnemonic(deployerMnemonic)
    
    // Convert Address object to string (deployer.addr is an Address object with a toString method)
    const deployerAddress = String(deployer.addr)
    
    console.log(`📝 Deployer: ${deployerAddress}`)
    console.log(`📍 App ID: ${APP_ID}`)
    console.log('')
    
    const treasuryAddress = deployerAddress
    const settlementAssetId = 0
    
    console.log(`💵 Settlement: ALGO (0)`)
    console.log(`💰 Treasury: ${treasuryAddress}`)
    console.log('')
    console.log('⚙️  Calling initialize...')
    
    // Encode the method call arguments
    const appArgs = [
      Buffer.from('f3f73bcc', 'hex'), // initialize method selector
      algosdk.encodeUint64(settlementAssetId),
      algosdk.decodeAddress(treasuryAddress).publicKey
    ]
    
    // Use AlgorandClient to send the transaction
    const result = await algorand.send.appCall({
      sender: deployer.addr,
      appId: BigInt(APP_ID),
      args: appArgs,
    })
    
    console.log('✅ Initialized!')
    console.log(`📍 Txn ID: ${result.txIds[0]}`)
    console.log('')
    console.log('🎉 V5 Ready!')
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
    throw error
  }
}

initializeContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
