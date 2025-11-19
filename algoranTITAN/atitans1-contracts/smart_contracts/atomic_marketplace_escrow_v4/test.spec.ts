/**
 * Test Suite for AtomicMarketplaceEscrowV4
 * 
 * Comprehensive tests for all contract functionality
 */

import { describe, test, beforeAll, expect } from '@jest/globals'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from '../artifacts/atomic_marketplace_escrow_v4/client'
import algosdk from 'algosdk'

describe('AtomicMarketplaceEscrowV4', () => {
  let algorand: AlgorandClient
  let escrowClient: AtomicMarketplaceEscrowV4Client
  let deployer: algosdk.Account
  let buyer: algosdk.Account
  let seller: algosdk.Account
  let financier: algosdk.Account
  let regulator: algosdk.Account
  let treasury: algosdk.Account
  
  let appId: number
  let appAddress: string
  let usdcAssetId: number
  
  beforeAll(async () => {
    // Initialize LocalNet client
    algorand = AlgorandClient.localNet()
    
    // Create test accounts
    deployer = await algorand.account.fromEnvironment('DEPLOYER')
    buyer = await algorand.account.random()
    seller = await algorand.account.random()
    financier = await algorand.account.random()
    regulator = await algorand.account.random()
    treasury = await algorand.account.random()
    
    // Fund test accounts
    await algorand.send.payment({
      sender: deployer.addr,
      receiver: buyer.addr,
      amount: AlgorandClient.algos(10),
    })
    await algorand.send.payment({
      sender: deployer.addr,
      receiver: seller.addr,
      amount: AlgorandClient.algos(10),
    })
    await algorand.send.payment({
      sender: deployer.addr,
      receiver: financier.addr,
      amount: AlgorandClient.algos(10),
    })
    await algorand.send.payment({
      sender: deployer.addr,
      receiver: regulator.addr,
      amount: AlgorandClient.algos(10),
    })
    
    // Create test USDC asset
    const assetCreate = await algorand.send.assetCreate({
      sender: deployer.addr,
      total: 1000000000000n,
      decimals: 6,
      assetName: 'Test USDC',
      unitName: 'USDC',
    })
    usdcAssetId = Number(assetCreate.assetId)
    
    // Distribute USDC to test accounts
    const accounts = [buyer, seller, financier, regulator, treasury]
    for (const account of accounts) {
      await algorand.send.assetOptIn({
        sender: account.addr,
        assetId: usdcAssetId,
      })
      await algorand.send.assetTransfer({
        sender: deployer.addr,
        receiver: account.addr,
        assetId: usdcAssetId,
        amount: 100000000000n, // 100,000 USDC
      })
    }
    
    // Deploy contract
    escrowClient = new AtomicMarketplaceEscrowV4Client(
      {
        sender: deployer,
        resolveBy: 'id',
        id: 0,
      },
      algorand.client.algod
    )
    
    const createResult = await escrowClient.create.bare()
    appId = Number(createResult.appId)
    appAddress = createResult.appAddress
    
    // Fund application
    await algorand.send.payment({
      sender: deployer.addr,
      receiver: appAddress,
      amount: AlgorandClient.algos(10),
    })
    
    // Initialize contract
    await escrowClient.initialize({
      defaultUsdcAssetId: usdcAssetId,
      treasuryAddress: treasury.addr,
    })
    
    // Opt contract into USDC
    await algorand.send.assetOptIn({
      sender: appAddress,
      assetId: usdcAssetId,
    })
  })
  
  describe('Initialization', () => {
    test('should initialize with correct parameters', async () => {
      const globalState = await escrowClient.appClient.getGlobalState()
      
      expect(globalState.defaultPaymentToken?.asNumber()).toBe(usdcAssetId)
      expect(globalState.nextTradeId?.asNumber()).toBe(1)
      expect(globalState.regulatorTaxRate?.asNumber()).toBe(500) // 5%
      expect(globalState.regulatorRefundRate?.asNumber()).toBe(200) // 2%
      expect(globalState.marketplaceFeeRate?.asNumber()).toBe(25) // 0.25%
    })
    
    test('should set demo configuration', async () => {
      const demoConfig = await escrowClient.getDemoConfig()
      
      expect(demoConfig[0].toString()).toBe('J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU')
      expect(demoConfig[1].toString()).toBe('7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI')
      expect(demoConfig[2].native).toBe(100000)
    })
  })
  
  describe('Trade Creation', () => {
    test('should create a trade', async () => {
      const tradeId = await escrowClient.createTrade(
        {
          sellerAddress: seller.addr,
          originalAmount: 10000000000, // $10,000 → $0.10 after division
          productType: 'Test Product',
          description: 'Test trade',
          ipfsHash: 'QmTest123',
        },
        { sender: buyer }
      )
      
      expect(tradeId).toBeGreaterThan(0)
      
      const trade = await escrowClient.getTrade({ tradeId })
      expect(trade.buyer.toString()).toBe(buyer.addr)
      expect(trade.seller.toString()).toBe(seller.addr)
      expect(trade.amount.native).toBe(100000) // Divided by 100,000
      expect(trade.state.native).toBe(0) // CREATED
    })
    
    test('should prevent trading with yourself', async () => {
      await expect(
        escrowClient.createTrade(
          {
            sellerAddress: buyer.addr, // Same as sender
            originalAmount: 10000000000,
            productType: 'Test',
            description: 'Test',
            ipfsHash: 'QmTest',
          },
          { sender: buyer }
        )
      ).rejects.toThrow()
    })
  })
  
  describe('Escrow - Buyer Funded', () => {
    let tradeId: number
    
    beforeAll(async () => {
      tradeId = await escrowClient.createTrade(
        {
          sellerAddress: seller.addr,
          originalAmount: 10000000000,
          productType: 'Test Product',
          description: 'Buyer escrow test',
          ipfsHash: 'QmTest456',
        },
        { sender: buyer }
      )
    })
    
    test('should escrow funds from buyer', async () => {
      const trade = await escrowClient.getTrade({ tradeId })
      const escrowCost = await escrowClient.calculateEscrowCost({ 
        amount: trade.amount.native 
      })
      
      const suggestedParams = await algorand.client.algod.getTransactionParams().do()
      const atc = new algosdk.AtomicTransactionComposer()
      
      // Payment transaction
      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: buyer.addr,
        to: appAddress,
        assetIndex: usdcAssetId,
        amount: Number(escrowCost[0].native),
        suggestedParams,
      })
      
      atc.addTransaction({ txn: paymentTxn, signer: buyer })
      
      // Escrow call
      await escrowClient.escrowTrade(
        { tradeId },
        { sender: buyer, sendParams: { atc } }
      )
      
      await atc.execute(algorand.client.algod, 3)
      
      const updatedTrade = await escrowClient.getTrade({ tradeId })
      expect(updatedTrade.state.native).toBe(1) // ESCROWED
      expect(updatedTrade.escrowProvider.toString()).toBe(buyer.addr)
    })
  })
  
  describe('Escrow - Financier Funded', () => {
    let tradeId: number
    
    beforeAll(async () => {
      tradeId = await escrowClient.createTrade(
        {
          sellerAddress: seller.addr,
          originalAmount: 10000000000,
          productType: 'Test Product',
          description: 'Financier escrow test',
          ipfsHash: 'QmTest789',
        },
        { sender: buyer }
      )
    })
    
    test('should escrow funds from financier', async () => {
      const trade = await escrowClient.getTrade({ tradeId })
      const escrowCost = await escrowClient.calculateEscrowCost({ 
        amount: trade.amount.native 
      })
      
      const suggestedParams = await algorand.client.algod.getTransactionParams().do()
      const atc = new algosdk.AtomicTransactionComposer()
      
      // Payment transaction
      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: financier.addr,
        to: appAddress,
        assetIndex: usdcAssetId,
        amount: Number(escrowCost[0].native),
        suggestedParams,
      })
      
      atc.addTransaction({ txn: paymentTxn, signer: financier })
      
      // Escrow call
      await escrowClient.escrowTradeAsFinancier(
        { tradeId },
        { sender: financier, sendParams: { atc } }
      )
      
      await atc.execute(algorand.client.algod, 3)
      
      const updatedTrade = await escrowClient.getTrade({ tradeId })
      expect(updatedTrade.state.native).toBe(1) // ESCROWED
      expect(updatedTrade.escrowProvider.toString()).toBe(financier.addr)
    })
    
    test('should prevent buyer from being financier', async () => {
      const newTradeId = await escrowClient.createTrade(
        {
          sellerAddress: seller.addr,
          originalAmount: 10000000000,
          productType: 'Test',
          description: 'Test',
          ipfsHash: 'QmTest',
        },
        { sender: buyer }
      )
      
      await expect(
        escrowClient.escrowTradeAsFinancier(
          { tradeId: newTradeId },
          { sender: buyer }
        )
      ).rejects.toThrow()
    })
  })
  
  describe('Cost Calculations', () => {
    test('should calculate escrow cost correctly', async () => {
      const amount = 1000000 // 1 USDC
      const result = await escrowClient.calculateEscrowCost({ amount })
      
      const fee = (amount * 25) / 10000 // 0.25%
      const total = amount + fee
      
      expect(result[0].native).toBe(total)
      expect(result[1].native).toBe(fee)
    })
    
    test('should calculate regulator costs correctly', async () => {
      const amount = 1000000 // 1 USDC
      const result = await escrowClient.calculateRegulatorCosts({ amount })
      
      const tax = (amount * 500) / 10000 // 5%
      const refund = (amount * 200) / 10000 // 2%
      
      expect(result[0].native).toBe(tax)
      expect(result[1].native).toBe(refund)
    })
  })
  
  describe('Query Functions', () => {
    let buyerTradeId: number
    let sellerTradeId: number
    
    beforeAll(async () => {
      buyerTradeId = await escrowClient.createTrade(
        {
          sellerAddress: seller.addr,
          originalAmount: 5000000000,
          productType: 'Query Test 1',
          description: 'Test',
          ipfsHash: 'QmQuery1',
        },
        { sender: buyer }
      )
      
      sellerTradeId = await escrowClient.createTrade(
        {
          sellerAddress: seller.addr,
          originalAmount: 3000000000,
          productType: 'Query Test 2',
          description: 'Test',
          ipfsHash: 'QmQuery2',
        },
        { sender: buyer }
      )
    })
    
    test('should get trades by buyer', async () => {
      const trades = await escrowClient.getTradesByBuyer({ 
        buyer: buyer.addr 
      })
      
      expect(trades.length).toBeGreaterThan(0)
      expect(trades.some(t => t.native === buyerTradeId)).toBe(true)
    })
    
    test('should get trades by seller', async () => {
      const trades = await escrowClient.getTradesBySeller({ 
        seller: seller.addr 
      })
      
      expect(trades.length).toBeGreaterThan(0)
      expect(trades.some(t => t.native === sellerTradeId)).toBe(true)
    })
  })
  
  describe('Admin Functions', () => {
    test('should allow creator to update rates', async () => {
      await escrowClient.setRates(
        {
          taxRate: 600,    // 6%
          refundRate: 250, // 2.5%
          feeRate: 30,     // 0.3%
        },
        { sender: deployer }
      )
      
      const globalState = await escrowClient.appClient.getGlobalState()
      expect(globalState.regulatorTaxRate?.asNumber()).toBe(600)
      expect(globalState.regulatorRefundRate?.asNumber()).toBe(250)
      expect(globalState.marketplaceFeeRate?.asNumber()).toBe(30)
      
      // Reset to defaults
      await escrowClient.setRates(
        {
          taxRate: 500,
          refundRate: 200,
          feeRate: 25,
        },
        { sender: deployer }
      )
    })
    
    test('should prevent non-creator from updating rates', async () => {
      await expect(
        escrowClient.setRates(
          {
            taxRate: 600,
            refundRate: 250,
            feeRate: 30,
          },
          { sender: buyer }
        )
      ).rejects.toThrow()
    })
  })
})
