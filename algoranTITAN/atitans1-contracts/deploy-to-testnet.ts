import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { mnemonicToSecretKey } from 'algosdk'
import { AtomicMarketplaceV3Factory } from './smart_contracts/artifacts/atomic_marketplace_v3/AtomicMarketplaceV3Client'
import { HelloWorldFactory } from './smart_contracts/artifacts/hello_world/HelloWorldClient'
import { SimpleCollateralLendingFactory } from './smart_contracts/artifacts/simple_collateral_lending/SimpleCollateralLendingClient'
import { TradeInstrumentRegistryV3Factory } from './smart_contracts/artifacts/trade_instrument_registry_v3/TradeInstrumentRegistryV3Client'
import * as fs from 'fs'
import * as path from 'path'

async function deployToTestNet() {
  console.log('🚀 Deploying ALL contracts to TestNet...')
  console.log('=' .repeat(50))
  
  // Read the deployer mnemonic from .env.testnet
  const envPath = path.join(__dirname, '.env.testnet')
  const envContent = fs.readFileSync(envPath, 'utf8')
  const mnemonicMatch = envContent.match(/DEPLOYER_MNEMONIC=(.+)/)
  
  if (!mnemonicMatch || !mnemonicMatch[1] || mnemonicMatch[1].trim() === 'your 25 word mnemonic phrase here') {
    throw new Error('❌ DEPLOYER_MNEMONIC not found in .env.testnet file')
  }
  
  const mnemonic = mnemonicMatch[1].trim()
  const deployerAccount = mnemonicToSecretKey(mnemonic)
  
  // Create TestNet Algorand client
  const algorand = AlgorandClient.testNet()
  
  // Register the deployer account with the client
  algorand.account.setSignerFromAccount({
    addr: deployerAccount.addr,
    sk: deployerAccount.sk
  })
  
  const deployer = {
    addr: deployerAccount.addr,
    sk: deployerAccount.sk
  }
  
  console.log(`📋 Deployer Address: ${deployer.addr}`)
  console.log(`🌐 Network: TestNet`)
  console.log('=' .repeat(50))
  
  try {
    // Check deployer balance
    const accountInfo = await algorand.client.algod.accountInformation(deployer.addr).do()
    console.log(`💰 Deployer Balance: ${Number(accountInfo.amount) / 1000000} ALGO`)
    
    if (Number(accountInfo.amount) < 5000000) { // Less than 5 ALGO
      console.log('⚠️  Warning: Low balance. You may need more ALGO for deployment.')
    }
    
    console.log()
    
    // 1. Deploy AtomicMarketplaceV3
    console.log('1️⃣ Deploying AtomicMarketplaceV3...')
    const marketplaceFactory = algorand.client.getTypedAppFactory(AtomicMarketplaceV3Factory, {
      defaultSender: deployer.addr,
    })
    
    const { appClient: marketplaceClient, result: marketplaceResult } = await marketplaceFactory.deploy({ 
      onUpdate: 'append', 
      onSchemaBreak: 'append' 
    })
    
    if (['create', 'replace'].includes(marketplaceResult.operationPerformed)) {
      await algorand.send.payment({
        amount: (1).algo(),
        sender: deployer.addr,
        receiver: marketplaceClient.appAddress,
      })
    }
    
    console.log(`✅ AtomicMarketplaceV3: App ID ${marketplaceClient.appClient.appId}`)
    console.log(`🔗 Explorer: https://testnet.algoexplorer.io/application/${marketplaceClient.appClient.appId}`)
    console.log()
    
    // 2. Deploy HelloWorld
    console.log('2️⃣ Deploying HelloWorld...')
    const helloFactory = algorand.client.getTypedAppFactory(HelloWorldFactory, {
      defaultSender: deployer.addr,
    })
    
    const { appClient: helloClient, result: helloResult } = await helloFactory.deploy({ 
      onUpdate: 'append', 
      onSchemaBreak: 'append' 
    })
    
    if (['create', 'replace'].includes(helloResult.operationPerformed)) {
      await algorand.send.payment({
        amount: (1).algo(),
        sender: deployer.addr,
        receiver: helloClient.appAddress,
      })
    }
    
    // Test HelloWorld with proper method call
    try {
      const result = await helloClient.send.hello({ args: { name: 'TestNet' } })
      console.log('📞 HelloWorld test call successful')
    } catch (error) {
      console.log('📞 HelloWorld deployed (test call skipped)')
    }
    
    console.log(`✅ HelloWorld: App ID ${helloClient.appClient.appId}`)
    console.log(`🔗 Explorer: https://testnet.algoexplorer.io/application/${helloClient.appClient.appId}`)
    console.log()
    
    // 3. Deploy SimpleCollateralLending
    console.log('3️⃣ Deploying SimpleCollateralLending...')
    
    // First create USDC asset for testing
    const usdcResult = await algorand.send.assetCreate({
      sender: deployer.addr,
      total: 1000000000000n, // 1 trillion units
      decimals: 6,
      assetName: 'USD Coin (USDC)',
      unitName: 'USDC',
    })
    const usdcAssetId = Number(usdcResult.confirmation.assetIndex)
    console.log(`💰 Created Test USDC Asset ID: ${usdcAssetId}`)
    
    const lendingFactory = algorand.client.getTypedAppFactory(SimpleCollateralLendingFactory, {
      defaultSender: deployer.addr,
    })
    
    const { appClient: lendingClient, result: lendingResult } = await lendingFactory.deploy({ 
      onUpdate: 'append', 
      onSchemaBreak: 'append' 
    })
    
    if (['create', 'replace'].includes(lendingResult.operationPerformed)) {
      await algorand.send.payment({
        amount: (1).algo(),
        sender: deployer.addr,
        receiver: lendingClient.appAddress,
      })
    }
    
    console.log(`✅ SimpleCollateralLending: App ID ${lendingClient.appClient.appId}`)
    console.log(`🔗 Explorer: https://testnet.algoexplorer.io/application/${lendingClient.appClient.appId}`)
    console.log()
    
    // 4. Deploy TradeInstrumentRegistryV3
    console.log('4️⃣ Deploying TradeInstrumentRegistryV3...')
    const registryFactory = algorand.client.getTypedAppFactory(TradeInstrumentRegistryV3Factory, {
      defaultSender: deployer.addr,
    })
    
    const { appClient: registryClient, result: registryResult } = await registryFactory.deploy({ 
      onUpdate: 'append', 
      onSchemaBreak: 'append' 
    })
    
    if (['create', 'replace'].includes(registryResult.operationPerformed)) {
      await algorand.send.payment({
        amount: (1).algo(),
        sender: deployer.addr,
        receiver: registryClient.appAddress,
      })
    }
    
    console.log(`✅ TradeInstrumentRegistryV3: App ID ${registryClient.appClient.appId}`)
    console.log(`🔗 Explorer: https://testnet.algoexplorer.io/application/${registryClient.appClient.appId}`)
    console.log()
    
    // Summary
    console.log('🎉 ALL CONTRACTS DEPLOYED TO TESTNET SUCCESSFULLY!')
    console.log('=' .repeat(50))
    console.log(`📍 Deployer: ${deployer.addr}`)
    console.log(`🔗 Account: https://testnet.algoexplorer.io/address/${deployer.addr}`)
    console.log()
    console.log('📱 Deployed Applications:')
    console.log(`1. AtomicMarketplaceV3: ${marketplaceClient.appClient.appId}`)
    console.log(`2. HelloWorld: ${helloClient.appClient.appId}`)
    console.log(`3. SimpleCollateralLending: ${lendingClient.appClient.appId}`)
    console.log(`4. TradeInstrumentRegistryV3: ${registryClient.appClient.appId}`)
    console.log(`5. Test USDC Asset: ${usdcAssetId}`)
    
    return {
      deployer: deployer.addr,
      contracts: {
        marketplace: marketplaceClient.appClient.appId,
        helloWorld: helloClient.appClient.appId,
        lending: lendingClient.appClient.appId,
        registry: registryClient.appClient.appId,
        usdcAsset: usdcAssetId
      }
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    throw error
  }
}

// Run the deployment
if (require.main === module) {
  deployToTestNet()
    .then((result) => {
      console.log('\n🚀 TestNet deployment complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Deployment failed:', error.message)
      process.exit(1)
    })
}

export { deployToTestNet }
