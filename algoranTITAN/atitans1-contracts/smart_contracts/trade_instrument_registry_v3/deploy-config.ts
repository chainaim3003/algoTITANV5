import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { TradeInstrumentRegistryV3Factory } from '../artifacts/trade_instrument_registry_v3/TradeInstrumentRegistryV3Client'

export async function deploy() {
  console.log('====================================')
  console.log('🚀 Deploying Trade Instrument Registry V3...')
  console.log('====================================')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  try {
    // Use the Factory pattern like working contracts
    const factory = algorand.client.getTypedAppFactory(TradeInstrumentRegistryV3Factory, {
      defaultSender: deployer.addr,
    })

    const { appClient, result } = await factory.deploy({ 
      onUpdate: 'append', 
      onSchemaBreak: 'append' 
    })

    // If app was just created, fund the app account
    if (['create', 'replace'].includes(result.operationPerformed)) {
      await algorand.send.payment({
        amount: (1).algo(),
        sender: deployer.addr,
        receiver: appClient.appAddress,
      })
    }

    console.log(`✅ TradeInstrumentRegistryV3 deployed successfully!`)
    console.log(`📍 App ID: ${appClient.appClient.appId}`)
    console.log(`📍 App Address: ${appClient.appAddress}`)

    return {
      appId: appClient.appClient.appId,
      appAddress: appClient.appAddress,
      operationPerformed: result.operationPerformed
    }

  } catch (error) {
    console.error('Error deploying TradeInstrumentRegistryV3:', error.message)
    throw error
  }
}
