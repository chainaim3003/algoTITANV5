/**
 * Deployment Configuration for AtomicMarketplaceEscrowV5
 * 
 * Updated to follow V4 pattern for TestNet deployment
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV5Factory } from '../artifacts/atomic_marketplace_escrow_v5/AtomicMarketplaceEscrowV5Client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load appropriate environment based on target network
const envFile = process.env.NETWORK === 'mainnet' ? '.env.mainnet' : '.env.testnet'
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) })

export async function deploy() {
  console.log('=== Deploying AtomicMarketplaceEscrowV5 ===')
  console.log(`Network: ${process.env.NETWORK || 'testnet'}`)
  console.log('')

  // Use appropriate network client
  const algorand = process.env.NETWORK === 'mainnet' 
    ? AlgorandClient.mainNet()
    : AlgorandClient.testNet()
  
  // Get deployer from mnemonic (following V4 pattern)
  const deployerMnemonic = process.env.DEPLOYER_MNEMONIC
  if (!deployerMnemonic) {
    throw new Error('DEPLOYER_MNEMONIC not found in environment')
  }
  
  const deployer = algorand.account.fromMnemonic(deployerMnemonic)
  console.log(`Deployer: ${deployer.addr}`)

  const factory = algorand.client.getTypedAppFactory(AtomicMarketplaceEscrowV5Factory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    deployTimeParams: {},
    createParams: {
      sender: deployer,
    },
    deleteParams: {},
    updateParams: {},
    onSchemaBreak: 'replace',
    onUpdate: 'update',
  })

  console.log(`App deployed with ID: ${appClient.appId}`)
  
  if (result.txIds && result.txIds.length > 0) {
    console.log(`Transaction ID: ${result.txIds[0]}`)
  } else {
    console.log('No transaction sent (app already up to date)')
  }

  return { appClient, result }
}
