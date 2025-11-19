import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { SimpleCollateralLendingFactory } from '../artifacts/simple_collateral_lending/SimpleCollateralLendingClient'

export async function deploy() {
  console.log('========================')
  console.log('Deploying SimpleCollateralLending V1 with Risk-Based LTV')
  console.log('========================')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  console.log('Deployer:', deployer.addr)

  // Create test USDC asset first (keeping existing logic)
  const testUSDC = await algorand.send.assetCreate({
    sender: deployer.addr,
    assetName: 'USD Coin (USDC)',
    unitName: 'USDC',
    total: 1_000_000_000_000n, // 1 trillion USDC
    decimals: 6,
    defaultFrozen: false,
  })

  console.log(`Test USDC Asset ID: ${testUSDC.assetId}`)

  try {
    // Use the Factory pattern like working contracts
    const factory = algorand.client.getTypedAppFactory(SimpleCollateralLendingFactory, {
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

    console.log(`✅ SimpleCollateralLending deployed successfully!`)
    console.log(`📍 App ID: ${appClient.appClient.appId}`)
    console.log(`📍 App Address: ${appClient.appAddress}`)

    return {
      appId: appClient.appClient.appId,
      appAddress: appClient.appAddress,
      operationPerformed: result.operationPerformed,
      usdcAssetId: testUSDC.assetId
    }

  } catch (error) {
    console.error('Error deploying SimpleCollateralLending:', error.message)
    throw error
  }
}
