#!/usr/bin/env ts-node

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { mnemonicToSecretKey } from 'algosdk'

async function checkTestNetDeployment() {
  console.log('🔍 Checking TestNet deployment...\n')
  
  // TestNet configuration
  const algorand = AlgorandClient.testNet()
  
  // Your deployer account
  const deployerAddress = 'Q5OXWYKCH75UKRJ2UK32SPGHTCOBAAYTNLN74JDP7LW3AI5F6B4LCGPKQI'
  
  try {
    // Get account info
    const accountInfo = await algorand.client.algod.accountInformation(deployerAddress).do()
    
    console.log('📊 Account Status:')
    console.log(`Address: ${deployerAddress}`)
    console.log(`Balance: ${accountInfo.amount / 1000000} ALGO`)
    console.log(`Apps Created: ${accountInfo['created-apps']?.length || 0}`)
    
    if (accountInfo['created-apps']?.length > 0) {
      console.log('\n🎯 Deployed Applications:')
      console.log('─'.repeat(50))
      
      for (const app of accountInfo['created-apps']) {
        console.log(`📱 App ID: ${app.id}`)
        console.log(`🔗 Explorer: https://testnet.algoexplorer.io/application/${app.id}`)
        console.log('─'.repeat(30))
      }
    } else {
      console.log('\n❌ No applications found on TestNet')
      console.log('💡 You need to deploy to TestNet first!')
    }
    
  } catch (error) {
    console.error('❌ Error checking deployment:', error.message)
  }
}

// Run the check
if (require.main === module) {
  checkTestNetDeployment()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error)
      process.exit(1)
    })
}

export { checkTestNetDeployment }
