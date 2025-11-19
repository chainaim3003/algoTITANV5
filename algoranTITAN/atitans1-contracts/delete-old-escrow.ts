/**
 * Delete the old Escrow V4 contract to allow fresh deployment
 */
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

const OLD_APP_ID = 746780258

async function deleteOldContract() {
  console.log('🗑️  Deleting old Escrow V4 contract...')
  
  const algorand = AlgorandClient.testNet()
  
  // Get deployer account
  const deployerMnemonic = process.env.DEPLOYER_MNEMONIC
  if (!deployerMnemonic) {
    throw new Error('DEPLOYER_MNEMONIC not found in environment')
  }
  
  const deployer = algorand.account.fromMnemonic(deployerMnemonic)
  console.log(`📝 Deployer: ${deployer.addr}`)
  
  try {
    // Delete the application using AlgoKit Utils
    const result = await algorand.send.appDelete({
      sender: deployer.addr,
      appId: BigInt(OLD_APP_ID),
    })
    
    console.log(`✅ Contract ${OLD_APP_ID} deleted successfully!`)
    console.log(`Transaction ID: ${result.txIds[0]}`)
    console.log('\nNow you can redeploy with: algokit project deploy testnet')
    
  } catch (error: any) {
    console.error('❌ Error deleting contract:', error.message)
    if (error.message.includes('application does not exist')) {
      console.log('Contract may already be deleted.')
    }
    throw error
  }
}

deleteOldContract()
