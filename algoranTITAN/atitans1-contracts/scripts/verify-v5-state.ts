/**
 * Verify V5 Contract State on TestNet
 * 
 * This script checks if the V5 contract is properly initialized
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load TestNet environment
dotenv.config({ path: path.join(__dirname, '..', '.env.testnet') })

async function verifyContract() {
  console.log('====================================')
  console.log('🔍 Verifying V5 Contract State...')
  console.log('====================================')
  console.log('')
  
  const APP_ID = 746822940
  
  try {
    // Connect to TestNet
    const algorand = AlgorandClient.testNet()
    
    // Get application info
    const appInfo = await algorand.client.algod.getApplicationByID(APP_ID).do()
    
    console.log(`📍 App ID: ${APP_ID}`)
    console.log(`📍 App Address: ${appInfo.params['global-state-schema']}`)
    console.log('')
    
    // Parse global state
    const globalState = appInfo.params['global-state'] || []
    
    console.log('📊 Global State:')
    console.log('─────────────────────────────────')
    
    for (const item of globalState) {
      const key = Buffer.from(item.key, 'base64').toString('utf-8')
      const value = item.value
      
      let displayValue: any = value.uint || value.bytes
      
      // Convert bytes to address if it looks like an address
      if (value.bytes) {
        const bytesBuffer = Buffer.from(value.bytes, 'base64')
        if (bytesBuffer.length === 32) {
          // Might be an address
          try {
            const algosdk = require('algosdk')
            displayValue = algosdk.encodeAddress(bytesBuffer)
          } catch {
            displayValue = bytesBuffer.toString('hex')
          }
        }
      }
      
      console.log(`${key}: ${displayValue}`)
    }
    
    console.log('─────────────────────────────────')
    console.log('')
    
    // Check if initialized
    const isInitialized = globalState.some(
      item => Buffer.from(item.key, 'base64').toString('utf-8') === 'nextTradeId'
    )
    
    if (isInitialized) {
      console.log('✅ Contract is INITIALIZED')
      console.log('')
      console.log('🎉 Ready to create trades!')
    } else {
      console.log('⚠️  Contract is NOT initialized')
      console.log('')
      console.log('Run: npx tsx scripts/initialize-v5-testnet.ts')
    }
    
    console.log('')
    console.log(`🔗 View on Explorer: https://testnet.explorer.perawallet.app/application/${APP_ID}`)
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message)
    throw error
  }
}

// Run verification
verifyContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
