/**
 * Simple ASA Creation Demo
 * 
 * This script demonstrates:
 * 1. Deploying the TradeInstrumentRegistryV3 contract
 * 2. Creating an eBL instrument (which creates an ASA)
 * 3. Ensuring the carrier can create and exporter gets manager access
 */

import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils'
import { TradeInstrumentRegistryV3Factory } from '../../artifacts/trade_instrument_registry_v3/TradeInstrumentRegistryV3Client'

// Configure logging
Config.configure({ debug: true })

export async function simpleAsaDemo() {
  console.log('🎯 Starting Simple ASA Creation Demo...')
  console.log('=======================================')

  try {
    // Initialize Algorand client
    const algorand = AlgorandClient.fromEnvironment()
    
    // Get accounts
    const deployer = await algorand.account.fromEnvironment('DEPLOYER')
    console.log(`📋 Deployer: ${deployer.addr}`)

    // Create test accounts for carrier, exporter, importer
    const carrier = await algorand.account.random()
    const exporter = await algorand.account.random()
    const importer = await algorand.account.random()

    console.log(`🚢 Carrier: ${carrier.addr}`)
    console.log(`📤 Exporter: ${exporter.addr}`)
    console.log(`📥 Importer: ${importer.addr}`)

    // Fund test accounts
    console.log('\n💰 Funding test accounts...')
    await algorand.send.payment({
      amount: (2).algo(),
      sender: deployer.addr,
      receiver: carrier.addr,
    })
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: exporter.addr,
    })
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: importer.addr,
    })

    // Deploy the contract if needed
    console.log('\n🚀 Deploying TradeInstrumentRegistryV3...')
    const factory = algorand.client.getTypedAppFactory(TradeInstrumentRegistryV3Factory, {
      defaultSender: deployer.addr,
    })

    const { appClient, result } = await factory.deploy({ 
      onUpdate: 'append', 
      onSchemaBreak: 'append' 
    })

    // Fund the app account if just created
    if (['create', 'replace'].includes(result.operationPerformed)) {
      await algorand.send.payment({
        amount: (5).algo(), // More funding for ASA creation
        sender: deployer.addr,
        receiver: appClient.appAddress,
      })
    }

    console.log(`✅ Contract deployed! App ID: ${appClient.appClient.appId}`)

    // Initialize the contract
    console.log('\n🔧 Initializing contract...')
    await appClient.initialize({}, { sender: deployer.addr })

    // Create a client for the carrier to use
    const carrierClient = algorand.client.getTypedAppClient(TradeInstrumentRegistryV3Factory, {
      appId: appClient.appClient.appId,
      defaultSender: carrier.addr,
    })

    // Carrier creates an eBL instrument (which creates an ASA)
    console.log('\n📋 Carrier creating eBL instrument...')
    const createResult = await carrierClient.createInstrument(
      {
        instrumentNumber: 'BL-2025-001',
        exporterAddress: exporter.addr,
        importerAddress: importer.addr,
        cargoDescription: 'Electronic Components',
        cargoValue: 50000,
        origin