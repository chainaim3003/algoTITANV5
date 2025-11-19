/**
 * Deploy Escrow V5 with vLEI Support to TestNet
 * Using AlgoKit's amount helpers
 */

import { AlgorandClient, algos } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV5Factory } from '../smart_contracts/artifacts/atomic_marketplace_escrow_v5/AtomicMarketplaceEscrowV5Client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import * as algosdk from 'algosdk'

dotenv.config({ path: path.join(__dirname, '..', '.env.testnet') })

async function deployToTestNet() {
  console.log('🚀 Deploying NEW Escrow V5 with vLEI Support to TestNet...\n')
  
  try {
    if (!process.env.DEPLOYER_MNEMONIC) {
      throw new Error('DEPLOYER_MNEMONIC not found in .env.testnet')
    }

    const algorand = AlgorandClient.testNet()
    const deployer = algorand.account.fromMnemonic(process.env.DEPLOYER_MNEMONIC)
    const deployerInfo = await algorand.client.algod.accountInformation(deployer.addr).do()
    
    const deployerAddress = String(deployer.addr)
    console.log('👤 Deployer:', deployerAddress)
    console.log('💰 Balance:', Number(deployerInfo.amount) / 1_000_000, 'ALGO\n')

    console.log('📦 Creating typed app factory...')
    const factory = algorand.client.getTypedAppFactory(AtomicMarketplaceEscrowV5Factory, {
      defaultSender: deployer.addr,
    })

    console.log('🔨 Deploying contract...')
    const { appClient } = await factory.deploy({
      deployTimeParams: {},
      createParams: { sender: deployer },
      onSchemaBreak: 'append',
      onUpdate: 'append',
    })

    const appId = Number(appClient.appId)
    const appAddress = algosdk.getApplicationAddress(appId)
    
    console.log('✅ Contract deployed!')
    console.log('📍 App ID:', appId)
    console.log('📍 App Address:', appAddress, '\n')

    // Fund using AlgoKit's algos() helper
    console.log('💰 Funding contract with 0.5 ALGO...')
    await algorand.send.payment({
      sender: deployer.addr,
      receiver: appAddress,
      amount: algos(0.5),
    })
    console.log('✅ Funded!\n')

    // Initialize using send method
    console.log('⚙️  Initializing contract...')
    const initResult = await appClient.send.initialize({
      args: {
        settlementAssetId: 0n,
        treasuryAddress: deployerAddress,
      }
    })
    console.log('✅ Initialized! Txn:', initResult.txIds[0], '\n')

    // Save deployment info
    const deploymentInfo = {
      network: 'testnet',
      appId,
      appAddress,
      deployerAddress,
      treasuryAddress: deployerAddress,
      settlementAssetId: 0,
      deployedAt: new Date().toISOString(),
      explorerUrl: `https://testnet.explorer.perawallet.app/application/${appId}`,
      previousAppId: 746822940,
      notes: 'vLEI-enabled Escrow V5 contract - FRESH DEPLOYMENT',
      rates: {
        regulatorTaxRate: 5.0,
        regulatorRefundRate: 2.0,
        marketplaceFeeRate: 0.25
      },
      vLEISupport: {
        enabled: true,
        boxMaps: {
          vlei_c: 'Creation vLEI documents (buyerLEI, sellerLEI, purchaseOrderVLEI + IPFS)',
          vlei_e: 'Execution vLEI documents (shippingInstruction, commercialInvoice, rwaInstrumentLEI + IPFS)'
        }
      }
    }

    fs.writeFileSync(
      path.join(__dirname, '..', 'deployment-info-v5-testnet-vLEI.json'),
      JSON.stringify(deploymentInfo, null, 2)
    )
    console.log('💾 Saved to deployment-info-v5-testnet-vLEI.json')

    console.log('\n' + '='.repeat(60))
    console.log('🎉 DEPLOYMENT COMPLETE!')
    console.log('='.repeat(60))
    console.log(`\n📋 CRITICAL: Update frontend .env.local:`)
    console.log(`   VITE_ESCROW_APP_ID=${appId}`)
    console.log(`\n✨ vLEI box storage is now ready!`)
    console.log(`\n🔗 View on explorer:`)
    console.log(`   https://testnet.explorer.perawallet.app/application/${appId}`)

  } catch (error: any) {
    console.error('\n❌ Failed:', error.message)
    if (error.stack) console.log('\n', error.stack)
    process.exit(1)
  }
}

deployToTestNet()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1) })
