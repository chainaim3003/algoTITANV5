// deploy-testnet.ts - Manual TestNet deployment script
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { deploy as deployTradeInstrumentRegistry } from './smart_contracts/trade_instrument_registry_v3/deploy-config'

async function deployToTestNet() {
  console.log('🚀 Deploying to TestNet...')
  
  try {
    // Set environment for TestNet
    process.env.ALGOD_SERVER = 'https://testnet-api.algonode.cloud'
    process.env.ALGOD_PORT = ''
    process.env.ALGOD_TOKEN = ''
    
    // Deploy TradeInstrumentRegistryV3
    console.log('📜 Deploying TradeInstrumentRegistryV3...')
    const result = await deployTradeInstrumentRegistry()
    
    console.log('✅ Deployment successful!')
    console.log('📍 App ID:', result.appId)
    console.log('📍 App Address:', result.appAddress)
    console.log('🔗 Explorer:', `https://testnet.algoexplorer.io/application/${result.appId}`)
    
    console.log('\n📝 Next Steps:')
    console.log('1. Update algorandService.ts with new App ID:', result.appId)
    console.log('2. Test the eBL creation with real blockchain transactions')
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Check your .env.testnet file has the correct DEPLOYER_MNEMONIC')
    console.log('2. Ensure you have sufficient TestNet ALGO (you have 29.989)')
    console.log('3. Verify internet connection to TestNet nodes')
  }
}

deployToTestNet().catch(console.error)
