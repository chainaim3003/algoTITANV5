/**
 * Example Usage of AtomicMarketplaceEscrowV4
 * 
 * This script demonstrates a complete trade flow:
 * 1. Create RWA instrument (BL)
 * 2. Create trade
 * 3. Escrow funds (buyer or financier)
 * 4. Execute trade (atomic swap)
 * 5. Acknowledge payment
 */

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from '../artifacts/atomic_marketplace_escrow_v4/client'
import { TradeInstrumentRegistryV3Client } from '../artifacts/trade_instrument_registry_v3/client'
import algosdk from 'algosdk'

// Configuration
const CONFIG = {
  escrowAppId: 0, // Replace with deployed app ID
  registryAppId: 0, // Replace with deployed registry app ID
  usdcAssetId: 10458941, // TestNet USDCa
  
  // Demo wallets (from deployment)
  importer: 'J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU',
  financier: '7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI',
}

async function runTradeExample() {
  console.log('🎬 Starting Complete Trade Example...\n')
  
  // Initialize Algorand client
  const algorand = AlgorandClient.testNet()
  
  // Get accounts
  const exporter = await getAccount(algorand, 'exporter')
  const importer = await getAccount(algorand, 'importer')
  const regulator = await getAccount(algorand, 'regulator')
  const financier = await getAccount(algorand, 'financier')
  
  console.log('👥 Participants:')
  console.log(`   Exporter (Seller): ${exporter.addr}`)
  console.log(`   Importer (Buyer): ${importer.addr}`)
  console.log(`   Regulator: ${regulator.addr}`)
  console.log(`   Financier: ${financier.addr}\n`)
  
  // Initialize clients
  const escrowClient = new AtomicMarketplaceEscrowV4Client(
    {
      sender: importer,
      resolveBy: 'id',
      id: CONFIG.escrowAppId,
    },
    algorand.client.algod
  )
  
  const registryClient = new TradeInstrumentRegistryV3Client(
    {
      sender: exporter,
      resolveBy: 'id',
      id: CONFIG.registryAppId,
    },
    algorand.client.algod
  )
  
  // ===== STEP 1: Create RWA Instrument (Bill of Lading) =====
  console.log('📜 STEP 1: Creating Bill of Lading...')
  
  const instrumentId = await registryClient.createInstrument({
    instrumentNumber: 'BL-2025-001',
    exporterAddress: exporter.addr,
    importerAddress: importer.addr,
    cargoDescription: 'Electronics - Laptops (100 units)',
    cargoValue: 5000000000, // $50,000 (will be divided by 100,000 = $500 demo)
    originPort: 'Shanghai Port',
    destinationPort: 'Los Angeles Port',
  })
  
  console.log(`   ✅ Instrument created: ID ${instrumentId}`)
  
  // Get instrument details
  const instrument = await registryClient.getInstrument({ instrumentId })
  const instrumentAssetId = instrument.instrumentAssetId.native
  
  console.log(`   📦 Instrument Asset ID: ${instrumentAssetId}`)
  console.log(`   💰 Cargo Value: $${instrument.cargoValue.native / 1000000}\n`)
  
  // ===== STEP 2: Create Trade =====
  console.log('📝 STEP 2: Creating Trade...')
  
  const tradeId = await escrowClient.createTrade({
    sellerAddress: exporter.addr,
    originalAmount: instrument.cargoValue.native, // Will be divided by 100,000
    productType: 'Electronics',
    description: 'Laptop shipment from Shanghai to LA',
    ipfsHash: 'QmExamplePurchaseOrderHash123',
  })
  
  console.log(`   ✅ Trade created: ID ${tradeId}`)
  
  // Get trade details
  let trade = await escrowClient.getTrade({ tradeId })
  console.log(`   💵 Demo Amount: ${trade.amount.native / 1000000} USDCa`)
  console.log(`   📊 State: CREATED\n`)
  
  // Calculate costs
  const escrowCost = await escrowClient.calculateEscrowCost({ 
    amount: trade.amount.native 
  })
  const regulatorCosts = await escrowClient.calculateRegulatorCosts({ 
    amount: trade.amount.native 
  })
  
  console.log('💰 Cost Breakdown:')
  console.log(`   Trade Amount: ${trade.amount.native / 1000000} USDCa`)
  console.log(`   Marketplace Fee (0.25%): ${escrowCost[1].native / 1000000} USDCa`)
  console.log(`   Total Escrow Required: ${escrowCost[0].native / 1000000} USDCa`)
  console.log(`   Regulator Tax (5%): ${regulatorCosts[0].native / 1000000} USDCa`)
  console.log(`   Regulator Refund (2%): ${regulatorCosts[1].native / 1000000} USDCa\n`)
  
  // ===== STEP 3a: Option 1 - Buyer Escrows Funds =====
  console.log('💰 STEP 3: Escrow Funds (Buyer-Funded Option)...')
  
  const suggestedParams = await algorand.client.algod.getTransactionParams().do()
  
  // Create atomic group: [payment, app call]
  const atc = new algosdk.AtomicTransactionComposer()
  
  // Transaction 0: USDCa payment from buyer to contract
  const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: importer.addr,
    to: (await escrowClient.appClient.getAppReference()).appAddress,
    assetIndex: CONFIG.usdcAssetId,
    amount: Number(escrowCost[0].native),
    suggestedParams,
  })
  
  atc.addTransaction({ txn: paymentTxn, signer: importer })
  
  // Transaction 1: Call escrowTrade
  await escrowClient.escrowTrade(
    { tradeId },
    { sendParams: { atc } }
  )
  
  await atc.execute(algorand.client.algod, 3)
  
  console.log(`   ✅ Funds escrowed by buyer`)
  
  trade = await escrowClient.getTrade({ tradeId })
  console.log(`   📊 State: ESCROWED`)
  console.log(`   💼 Escrow Provider: ${trade.escrowProvider.toString()}\n`)
  
  // ===== STEP 4: Execute Trade (Atomic Swap) =====
  console.log('⚡ STEP 4: Execute Trade (Atomic Swap)...')
  
  // Importer must opt-in to receive the instrument NFT
  console.log('   🔗 Opting importer into instrument asset...')
  await algorand.send.assetOptIn({
    sender: importer.addr,
    assetId: instrumentAssetId,
  })
  
  // Create atomic group: [NFT transfer, tax payment, app call]
  const executeAtc = new algosdk.AtomicTransactionComposer()
  
  // Transaction 0: Transfer instrument NFT from exporter to importer
  const nftTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: exporter.addr,
    to: importer.addr, // Goes to buyer (buyer-funded escrow)
    assetIndex: instrumentAssetId,
    amount: 1,
    suggestedParams,
  })
  
  executeAtc.addTransaction({ txn: nftTransferTxn, signer: exporter })
  
  // Transaction 1: Regulator tax payment from exporter
  const taxPaymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: exporter.addr,
    to: regulator.addr,
    assetIndex: CONFIG.usdcAssetId,
    amount: Number(regulatorCosts[0].native),
    suggestedParams,
  })
  
  executeAtc.addTransaction({ txn: taxPaymentTxn, signer: exporter })
  
  // Transaction 2: Call executeTrade
  await escrowClient.executeTrade(
    {
      tradeId,
      instrumentAssetId,
      instrumentTypeNum: 0, // 0 = BL, 1 = Warehouse Receipt
      leiId: 'LEI-123456789',
      leiName: 'Acme Trading Corp',
      instrumentNumber: 'BL-2025-001',
      regulatorWallet: regulator.addr,
    },
    { 
      sender: exporter,
      sendParams: { atc: executeAtc } 
    }
  )
  
  await executeAtc.execute(algorand.client.algod, 3)
  
  console.log(`   ✅ Trade executed!`)
  console.log(`   📦 Instrument transferred to importer`)
  console.log(`   💵 Payment sent to exporter`)
  console.log(`   🏛️  Tax paid to regulator`)
  
  trade = await escrowClient.getTrade({ tradeId })
  console.log(`   📊 State: EXECUTED\n`)
  
  // ===== STEP 5: Acknowledge Payment =====
  console.log('✅ STEP 5: Acknowledge Payment...')
  
  // Create atomic group: [regulator refund, app call]
  const ackAtc = new algosdk.AtomicTransactionComposer()
  
  // Transaction 0: Regulator refund to exporter
  const refundTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: regulator.addr,
    to: exporter.addr,
    assetIndex: CONFIG.usdcAssetId,
    amount: Number(regulatorCosts[1].native),
    suggestedParams,
  })
  
  ackAtc.addTransaction({ txn: refundTxn, signer: regulator })
  
  // Transaction 1: Call acknowledgePayment
  await escrowClient.acknowledgePayment(
    { tradeId },
    { 
      sender: exporter,
      sendParams: { atc: ackAtc } 
    }
  )
  
  await ackAtc.execute(algorand.client.algod, 3)
  
  console.log(`   ✅ Payment acknowledged`)
  console.log(`   💰 Regulator refund sent to exporter`)
  
  trade = await escrowClient.getTrade({ tradeId })
  console.log(`   📊 State: COMPLETED\n`)
  
  // ===== Summary =====
  console.log('📊 TRADE SUMMARY:')
  console.log('=' .repeat(60))
  
  const metadata = await escrowClient.getTradeMetadata({ tradeId })
  
  console.log(`Trade ID: ${tradeId}`)
  console.log(`Instrument: ${metadata.instrumentNumber.toString()}`)
  console.log(`Buyer: ${trade.buyer.toString()}`)
  console.log(`Seller: ${trade.seller.toString()}`)
  console.log(`Amount: ${trade.amount.native / 1000000} USDCa`)
  console.log(`State: COMPLETED`)
  console.log('')
  console.log('💸 Payment Flow:')
  console.log(`  1. Buyer → Contract: ${escrowCost[0].native / 1000000} USDCa`)
  console.log(`  2. Contract → Treasury: ${trade.marketplaceFee.native / 1000000} USDCa`)
  console.log(`  3. Contract → Seller: ${trade.amount.native / 1000000} USDCa`)
  console.log(`  4. Seller → Regulator: ${trade.regulatorTaxPaid.native / 1000000} USDCa`)
  console.log(`  5. Regulator → Seller: ${trade.regulatorRefundDue.native / 1000000} USDCa`)
  console.log('')
  console.log('📦 Asset Flow:')
  console.log(`  Instrument NFT (${instrumentAssetId}) → Importer`)
  console.log('')
  console.log('✅ Trade completed successfully!')
  console.log('=' .repeat(60))
}

// ===== Alternative: Financier-Funded Escrow Example =====
async function runFinancierFundedExample() {
  console.log('\n🏦 ALTERNATIVE: Financier-Funded Escrow...\n')
  
  const algorand = AlgorandClient.testNet()
  
  const exporter = await getAccount(algorand, 'exporter')
  const importer = await getAccount(algorand, 'importer')
  const financier = await getAccount(algorand, 'financier')
  
  const escrowClient = new AtomicMarketplaceEscrowV4Client(
    {
      sender: importer,
      resolveBy: 'id',
      id: CONFIG.escrowAppId,
    },
    algorand.client.algod
  )
  
  // Create trade (same as before)
  const tradeId = await escrowClient.createTrade({
    sellerAddress: exporter.addr,
    originalAmount: 5000000000,
    productType: 'Electronics',
    description: 'Laptop shipment',
    ipfsHash: 'QmExampleHash',
  })
  
  console.log(`Trade created: ${tradeId}`)
  
  // Financier escrows funds
  const trade = await escrowClient.getTrade({ tradeId })
  const escrowCost = await escrowClient.calculateEscrowCost({ 
    amount: trade.amount.native 
  })
  
  const suggestedParams = await algorand.client.algod.getTransactionParams().do()
  const atc = new algosdk.AtomicTransactionComposer()
  
  // Transaction 0: USDCa payment from FINANCIER to contract
  const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: financier.addr,
    to: (await escrowClient.appClient.getAppReference()).appAddress,
    assetIndex: CONFIG.usdcAssetId,
    amount: Number(escrowCost[0].native),
    suggestedParams,
  })
  
  atc.addTransaction({ txn: paymentTxn, signer: financier })
  
  // Transaction 1: Call escrowTradeAsFinancier
  await escrowClient.escrowTradeAsFinancier(
    { tradeId },
    { 
      sender: financier,
      sendParams: { atc } 
    }
  )
  
  await atc.execute(algorand.client.algod, 3)
  
  console.log('✅ Financier escrowed funds')
  
  // When executing, NFT goes to MARKETPLACE instead of buyer
  console.log('📦 NFT will go to marketplace (not buyer) in this scenario')
  console.log('💡 Marketplace can later transfer to buyer or use in secondary market')
}

// Helper function to get accounts
async function getAccount(algorand: AlgorandClient, role: string) {
  // In production, load from environment variables or secure storage
  // For demo, you can use:
  // - LocalNet default accounts
  // - TestNet accounts from mnemonics
  // - KMD wallet accounts
  
  if (process.env[`${role.toUpperCase()}_MNEMONIC`]) {
    return algorand.account.fromMnemonic(
      process.env[`${role.toUpperCase()}_MNEMONIC`]
    )
  }
  
  // Fallback to LocalNet
  const kmdAccounts = await algorand.account.kmd.getWalletAccount(
    'unencrypted-default-wallet',
    async (wallets) => wallets[0]
  )
  
  return kmdAccounts
}

// Run the example
if (require.main === module) {
  runTradeExample()
    .then(() => {
      console.log('\n✅ Example completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Example failed:', error)
      process.exit(1)
    })
}

export { runTradeExample, runFinancierFundedExample }
