import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceV3Factory } from '../artifacts/atomic_marketplace_v3/AtomicMarketplaceV3Client'

// Official Algorand USDC Asset IDs
const OFFICIAL_TESTNET_USDC = 10458941  // Circle's official TestNet USDC
const OFFICIAL_MAINNET_USDC = 31566704  // Circle's official MainNet USDC
const CUSTOM_TEST_USDC = 746654280      // Your custom test USDC (optional)

export async function deploy() {
  console.log('====================================')
  console.log('🚀 Deploying Atomic Marketplace V3 with Multi-Asset Support...')
  console.log('====================================')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  // Determine which USDC to use based on network
  const network = process.env.ALGOD_SERVER || ''
  const isMainNet = network.includes('mainnet')
  const isTestNet = network.includes('testnet')
  
  const defaultUsdcAssetId = isMainNet ? OFFICIAL_MAINNET_USDC : OFFICIAL_TESTNET_USDC
  
  console.log(`📡 Network: ${isMainNet ? 'MainNet' : isTestNet ? 'TestNet' : 'LocalNet'}`)
  console.log(`💵 Default USDC Asset ID: ${defaultUsdcAssetId}`)
  console.log(`   ${isMainNet ? 'MainNet' : 'TestNet'} Official USDC`)

  try {
    // Use the same Factory pattern as working contracts
    const factory = algorand.client.getTypedAppFactory(AtomicMarketplaceV3Factory, {
      defaultSender: deployer.addr,
    })

    const { appClient, result } = await factory.deploy({ 
      onUpdate: 'append', 
      onSchemaBreak: 'append' 
    })

    // If app was just created or replaced, fund FIRST then initialize
    if (['create', 'replace'].includes(result.operationPerformed)) {
      // IMPORTANT: Fund the app account BEFORE calling initialize
      // Box storage requires minimum balance
      console.log('💰 Funding app account (needed for box storage)...')
      await algorand.send.payment({
        amount: (0.5).algo(), // 0.5 ALGO for box storage + operations
        sender: deployer.addr,
        receiver: appClient.appAddress,
      })
      console.log(`✅ App account funded with 0.5 ALGO`)
      
      console.log('🔧 Initializing marketplace with official USDC...')
      
      // Initialize with official USDC as default
      await appClient.send.initialize({
        args: { defaultUsdcAssetId },
        sendParams: {
          fee: (2000).microAlgo(), // Higher fee for box operations
        },
        boxReferences: [
          { appId: appClient.appClient.appId, name: new Uint8Array(Buffer.from(`payments${defaultUsdcAssetId.toString().padStart(8, '0')}`)) }
        ]
      })
      
      console.log(`✅ Marketplace initialized with official USDC: ${defaultUsdcAssetId}`)
      
      // Optionally add custom USDC as alternative payment method (TestNet only)
      if (isTestNet || !isMainNet) {
        console.log('🔧 Adding custom test USDC as alternative payment option...')
        try {
          await appClient.send.addPaymentAsset({
            args: { assetId: CUSTOM_TEST_USDC },
            sendParams: {
              fee: (2000).microAlgo(),
            },
            boxReferences: [
              { appId: appClient.appClient.appId, name: new Uint8Array(Buffer.from(`payments${CUSTOM_TEST_USDC.toString().padStart(8, '0')}`)) }
            ]
          })
          console.log(`✅ Custom USDC added as payment option: ${CUSTOM_TEST_USDC}`)
        } catch (error) {
          console.log(`⚠️  Note: Custom USDC might not exist on this network (${error.message})`)
        }
      }
      
      console.log('💰 Adding operational funds to app account...')
      // Add more ALGO for transaction fees and operations
      await algorand.send.payment({
        amount: (0.5).algo(),
        sender: deployer.addr,
        receiver: appClient.appAddress,
      })
      
      console.log('💰 Total app funding: 1 ALGO')
    } else {
      console.log('ℹ️  Marketplace already deployed, skipping initialization')
    }

    console.log(`✅ AtomicMarketplaceV3 deployed successfully!`)
    console.log(`📍 App ID: ${appClient.appClient.appId}`)
    console.log(`📍 App Address: ${appClient.appAddress}`)
    console.log(`💵 Accepted Payment Assets:`)
    console.log(`   - Default: Official USDC (${defaultUsdcAssetId})`)
    if (isTestNet || !isMainNet) {
      console.log(`   - Optional: Custom USDC (${CUSTOM_TEST_USDC})`)
    }
    console.log(`   - ALGO (native)`)
    console.log(`\n🎉 Marketplace ready for Lute wallet and all Algorand wallets!`)

    return {
      appId: appClient.appClient.appId,
      appAddress: appClient.appAddress,
      operationPerformed: result.operationPerformed,
      defaultUsdcAssetId,
      customUsdcAssetId: isTestNet ? CUSTOM_TEST_USDC : null
    }

  } catch (error) {
    console.error('❌ Error deploying AtomicMarketplaceV3:', error.message)
    throw error
  }
}
