/**
 * Deployment Script for AtomicMarketplaceEscrowV4
 * 
 * This script deploys the escrow contract to TestNet/LocalNet
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from '../artifacts/atomic_marketplace_escrow_v4/client'
import { ESCROW_V4_CONFIG } from './deploy-config'

async function deployEscrowV4() {
  console.log('🚀 Deploying AtomicMarketplaceEscrowV4...')
  
  // Initialize Algorand client
  const algorand = AlgorandClient.testNet()
  
  // Get deployer account (from environment or KMD)
  const deployer = await getDeployerAccount(algorand)
  console.log(`📝 Deployer: ${deployer.addr}`)
  
  // Create contract client
  const appClient = new AtomicMarketplaceEscrowV4Client(
    {
      sender: deployer,
      resolveBy: 'id',
      id: 0,
    },
    algorand.client.algod
  )
  
  console.log('📦 Creating application...')
  
  // Deploy contract
  const { appId, appAddress } = await appClient.create.bare()
  
  console.log(`✅ Application created!`)
  console.log(`   App ID: ${appId}`)
  console.log(`   App Address: ${appAddress}`)
  
  // Fund the application account for inner transactions
  console.log('💰 Funding application account...')
  await algorand.send.payment({
    sender: deployer.addr,
    receiver: appAddress,
    amount: AlgorandClient.algos(10), // 10 ALGO for inner txns
  })
  
  // Initialize the contract
  console.log('⚙️  Initializing contract...')
  
  const treasuryAddress = ESCROW_V4_CONFIG.testnet.treasuryAddress !== 'YOUR_TREASURY_ADDRESS_HERE'
    ? ESCROW_V4_CONFIG.testnet.treasuryAddress
    : deployer.addr // Use deployer as treasury if not configured
  
  await appClient.initialize({
    defaultUsdcAssetId: ESCROW_V4_CONFIG.testnet.usdcAssetId,
    treasuryAddress: treasuryAddress,
  })
  
  console.log('✅ Contract initialized!')
  console.log(`   Treasury: ${treasuryAddress}`)
  console.log(`   USDCa Asset: ${ESCROW_V4_CONFIG.testnet.usdcAssetId}`)
  console.log(`   Regulator Tax Rate: ${ESCROW_V4_CONFIG.rates.regulatorTaxRate / 100}%`)
  console.log(`   Regulator Refund Rate: ${ESCROW_V4_CONFIG.rates.regulatorRefundRate / 100}%`)
  console.log(`   Marketplace Fee Rate: ${ESCROW_V4_CONFIG.rates.marketplaceFeeRate / 100}%`)
  
  // Opt contract into USDCa
  console.log('🔗 Opting contract into USDCa...')
  await algorand.send.assetOptIn({
    sender: appAddress,
    assetId: ESCROW_V4_CONFIG.testnet.usdcAssetId,
  })
  
  console.log('✅ Contract opted into USDCa!')
  
  // Display demo configuration
  console.log('\n📊 Demo Configuration:')
  console.log(`   Importer Buyer1: ${ESCROW_V4_CONFIG.testnet.importerBuyer1}`)
  console.log(`   Financier Large 1: ${ESCROW_V4_CONFIG.testnet.financierLarge1}`)
  console.log(`   Amount Divisor: ${ESCROW_V4_CONFIG.demo.amountDivisor}`)
  
  // Save deployment info
  const deploymentInfo = {
    network: 'testnet',
    appId,
    appAddress,
    deployerAddress: deployer.addr,
    treasuryAddress,
    usdcAssetId: ESCROW_V4_CONFIG.testnet.usdcAssetId,
    deployedAt: new Date().toISOString(),
    config: ESCROW_V4_CONFIG,
  }
  
  console.log('\n💾 Deployment Info:')
  console.log(JSON.stringify(deploymentInfo, null, 2))
  
  // Write to file
  const fs = require('fs')
  fs.writeFileSync(
    './deployment-info-v4.json',
    JSON.stringify(deploymentInfo, null, 2)
  )
  
  console.log('\n✅ Deployment complete! Info saved to deployment-info-v4.json')
  console.log('\n🎉 Ready to create trades!')
  
  return deploymentInfo
}

async function getDeployerAccount(algorand: AlgorandClient) {
  // Try to get from environment first
  if (process.env.DEPLOYER_MNEMONIC) {
    return algorand.account.fromMnemonic(process.env.DEPLOYER_MNEMONIC)
  }
  
  // Fall back to LocalNet default account
  const kmdAccounts = await algorand.account.kmd.getWalletAccount(
    'unencrypted-default-wallet',
    async (wallets) => wallets[0]
  )
  
  return kmdAccounts
}

// Run deployment
deployEscrowV4()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  })
