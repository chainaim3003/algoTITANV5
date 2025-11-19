import * as dotenv from 'dotenv'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

// Load TestNet environment variables
dotenv.config({ path: '.env.testnet' })

async function checkBalance() {
  console.log('====================================')
  console.log('💰 Account Balance Checker')
  console.log('====================================\n')

  // Create Algorand client for TestNet
  const algorand = AlgorandClient.testNet()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  console.log(`📍 Checking balance for: ${deployer.addr}\n`)

  try {
    const accountInfo = await algorand.client.algod.accountInformation(deployer.addr).do()
    
    // Convert to numbers properly - using correct field names
    const balanceInMicroAlgo = Number(accountInfo.amount)
    const minBalanceInMicroAlgo = Number(accountInfo['min-balance'] || accountInfo.minBalance || 0)
    
    const balanceInAlgo = balanceInMicroAlgo / 1_000_000
    const minBalanceInAlgo = minBalanceInMicroAlgo / 1_000_000
    const availableBalance = balanceInAlgo - minBalanceInAlgo
    
    const numAssets = accountInfo.assets?.length || 0
    const numApps = Number(accountInfo['total-apps-opted-in'] || accountInfo.totalAppsOptedIn || 0)
    
    // Calculate minimum balance manually if not provided
    const calculatedMinBalance = (0.1 + (numAssets * 0.1) + (numApps * 0.1))

    console.log('💵 Balance Information:')
    console.log(`   Total Balance:      ${balanceInAlgo.toFixed(6)} ALGO`)
    console.log(`   Minimum Balance:    ${(minBalanceInAlgo || calculatedMinBalance).toFixed(6)} ALGO`)
    console.log(`   Available Balance:  ${(balanceInAlgo - (minBalanceInAlgo || calculatedMinBalance)).toFixed(6)} ALGO`)
    console.log(`\n📊 Account Stats:`)
    console.log(`   Assets Held:        ${numAssets}`)
    console.log(`   Apps Opted In:      ${numApps}`)
    
    console.log(`\n💡 Minimum Balance Breakdown:`)
    console.log(`   Base Account:       0.100000 ALGO`)
    console.log(`   Assets (${numAssets} × 0.1):   ${(numAssets * 0.1).toFixed(6)} ALGO`)
    console.log(`   Apps (${numApps} × 0.1):     ${(numApps * 0.1).toFixed(6)} ALGO`)
    console.log(`   ────────────────────────────────`)
    console.log(`   Total Minimum:      ${calculatedMinBalance.toFixed(6)} ALGO`)

    const requiredForInit = 2.1 // 2 ALGO + 0.1 buffer
    const actualAvailable = balanceInAlgo - calculatedMinBalance
    
    console.log(`\n🎯 Transaction Requirements:`)
    console.log(`   Needed for init:    ${requiredForInit.toFixed(6)} ALGO`)
    
    if (actualAvailable >= requiredForInit) {
      console.log(`   Status:             ✅ SUFFICIENT`)
      console.log(`   Extra available:    ${(actualAvailable - requiredForInit).toFixed(6)} ALGO`)
    } else {
      console.log(`   Status:             ❌ INSUFFICIENT`)
      console.log(`   Shortfall:          ${(requiredForInit - actualAvailable).toFixed(6)} ALGO`)
      console.log(`\n💡 To get testnet ALGO:`)
      console.log(`   1. Visit: https://bank.testnet.algorand.network/`)
      console.log(`   2. Enter address: ${deployer.addr}`)
      console.log(`   3. Complete CAPTCHA and request funds`)
      console.log(`   4. You'll receive 10 ALGO instantly`)
    }

    // List assets if any
    if (numAssets > 0) {
      console.log(`\n📦 Assets Held:`)
      for (const asset of accountInfo.assets || []) {
        const assetId = asset['asset-id'] || asset.assetId
        const amount = asset.amount
        console.log(`   - Asset ID ${assetId}: ${Number(amount).toLocaleString()} units`)
      }
    }

    console.log('\n====================================')

  } catch (error) {
    console.error('❌ Error checking balance:', error)
    throw error
  }
}

checkBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
