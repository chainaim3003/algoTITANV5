# AtomicMarketplaceEscrowV4 Integration Guide

## Overview

This guide walks you through integrating the AtomicMarketplaceEscrowV4 contract into your trade finance application. The contract implements the same state-based escrow flow as the Solidity AdvancedEscrowV2 contract but uses Algorand's atomic transaction groups for secure, atomic swaps.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Deployment](#deployment)
4. [Contract Integration](#contract-integration)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)
7. [Production Checklist](#production-checklist)

## Prerequisites

### Required Knowledge
- Algorand blockchain basics
- AlgoKit framework
- TypeScript/JavaScript
- Atomic transaction groups
- ASA (Algorand Standard Assets)

### Required Tools
- Node.js 18+
- AlgoKit CLI
- Algorand sandbox or TestNet access
- Lute wallet or Pera wallet (for testing)

### Required Assets
- USDCa stablecoin asset (TestNet: 10458941)
- RWA instrument NFTs (from TradeInstrumentRegistry)

## Installation

### 1. Clone or Navigate to Project

```bash
cd C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-contracts
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Compile Contract

```bash
algokit compile py smart_contracts/atomic_marketplace_escrow_v4
```

## Deployment

### LocalNet Deployment

```bash
# Start LocalNet
algokit localnet start

# Deploy contract
npx ts-node smart_contracts/atomic_marketplace_escrow_v4/deploy.ts
```

### TestNet Deployment

```bash
# Set deployer mnemonic
export DEPLOYER_MNEMONIC="your 25-word mnemonic here"

# Deploy to TestNet
npx ts-node smart_contracts/atomic_marketplace_escrow_v4/deploy.ts --network testnet
```

### Deployment Output

The deployment script will output:
- App ID
- App Address
- Treasury Address
- USDCa Asset ID
- Demo wallet addresses
- Rate configurations

Save this information for integration!

## Contract Integration

### Step 1: Initialize Client

```typescript
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from './artifacts/atomic_marketplace_escrow_v4/client'

// Initialize Algorand client
const algorand = AlgorandClient.testNet()

// Get user account (from wallet, mnemonic, etc.)
const userAccount = await algorand.account.fromMnemonic(mnemonic)

// Create contract client
const escrowClient = new AtomicMarketplaceEscrowV4Client(
  {
    sender: userAccount,
    resolveBy: 'id',
    id: YOUR_APP_ID, // From deployment
  },
  algorand.client.algod
)
```

### Step 2: Create a Trade

```typescript
// As the buyer/importer
async function createTrade(
  sellerAddress: string,
  cargoValue: number,
  productType: string,
  description: string,
  ipfsHash: string
) {
  const tradeId = await escrowClient.createTrade({
    sellerAddress,
    originalAmount: cargoValue, // Will be divided by 100,000 for demo
    productType,
    description,
    ipfsHash,
  })
  
  console.log(`Trade created: ${tradeId}`)
  return tradeId
}
```

### Step 3: Escrow Funds

#### Option A: Buyer Escrows

```typescript
async function escrowAsBuyer(tradeId: number) {
  // Get trade details
  const trade = await escrowClient.getTrade({ tradeId })
  
  // Calculate total required
  const { totalCost } = await escrowClient.calculateEscrowCost({ 
    amount: trade.amount.native 
  })
  
  // Create atomic group
  const suggestedParams = await algorand.client.algod.getTransactionParams().do()
  const atc = new algosdk.AtomicTransactionComposer()
  
  // Transaction 0: Payment
  const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: buyerAddress,
    to: appAddress,
    assetIndex: usdcAssetId,
    amount: Number(totalCost.native),
    suggestedParams,
  })
  
  atc.addTransaction({ txn: paymentTxn, signer: buyerAccount })
  
  // Transaction 1: Escrow call
  await escrowClient.escrowTrade(
    { tradeId },
    { sendParams: { atc } }
  )
  
  // Execute atomic group
  await atc.execute(algorand.client.algod, 3)
  
  console.log('Funds escrowed successfully')
}
```

#### Option B: Financier Escrows

```typescript
async function escrowAsFinancier(tradeId: number) {
  // Same as above, but use escrowTradeAsFinancier
  await escrowClient.escrowTradeAsFinancier(
    { tradeId },
    { sender: financierAccount, sendParams: { atc } }
  )
}
```

### Step 4: Execute Trade (Atomic Swap)

```typescript
async function executeTrade(
  tradeId: number,
  instrumentAssetId: number,
  instrumentType: number, // 0=BL, 1=WarehouseReceipt
  leiId: string,
  leiName: string,
  instrumentNumber: string,
  regulatorAddress: string
) {
  const trade = await escrowClient.getTrade({ tradeId })
  
  // Calculate regulator tax
  const { taxAmount } = await escrowClient.calculateRegulatorCosts({ 
    amount: trade.amount.native 
  })
  
  // Determine NFT destination
  const nftDestination = trade.escrowProvider.toString() === trade.buyer.toString()
    ? trade.buyer.toString()  // Buyer funded → NFT to buyer
    : appAddress              // Financier funded → NFT to marketplace
  
  // Ensure buyer/marketplace has opted into the NFT
  if (nftDestination !== sellerAddress) {
    await algorand.send.assetOptIn({
      sender: nftDestination,
      assetId: instrumentAssetId,
    })
  }
  
  // Create atomic group
  const suggestedParams = await algorand.client.algod.getTransactionParams().do()
  const atc = new algosdk.AtomicTransactionComposer()
  
  // Transaction 0: NFT transfer
  const nftTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: sellerAddress,
    to: nftDestination,
    assetIndex: instrumentAssetId,
    amount: 1,
    suggestedParams,
  })
  
  atc.addTransaction({ txn: nftTxn, signer: sellerAccount })
  
  // Transaction 1: Tax payment
  const taxTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: sellerAddress,
    to: regulatorAddress,
    assetIndex: usdcAssetId,
    amount: Number(taxAmount.native),
    suggestedParams,
  })
  
  atc.addTransaction({ txn: taxTxn, signer: sellerAccount })
  
  // Transaction 2: Execute trade call
  await escrowClient.executeTrade(
    {
      tradeId,
      instrumentAssetId,
      instrumentTypeNum: instrumentType,
      leiId,
      leiName,
      instrumentNumber,
      regulatorWallet: regulatorAddress,
    },
    { 
      sender: sellerAccount,
      sendParams: { atc } 
    }
  )
  
  // Execute atomic group
  await atc.execute(algorand.client.algod, 3)
  
  console.log('Trade executed successfully')
}
```

### Step 5: Acknowledge Payment

```typescript
async function acknowledgePayment(tradeId: number) {
  const trade = await escrowClient.getTrade({ tradeId })
  
  // Create atomic group
  const suggestedParams = await algorand.client.algod.getTransactionParams().do()
  const atc = new algosdk.AtomicTransactionComposer()
  
  // Transaction 0: Regulator refund
  const refundTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: trade.regulatorWallet.toString(),
    to: trade.seller.toString(),
    assetIndex: usdcAssetId,
    amount: Number(trade.regulatorRefundDue.native),
    suggestedParams,
  })
  
  atc.addTransaction({ txn: refundTxn, signer: regulatorAccount })
  
  // Transaction 1: Acknowledge call
  await escrowClient.acknowledgePayment(
    { tradeId },
    { 
      sender: sellerAccount,
      sendParams: { atc } 
    }
  )
  
  // Execute atomic group
  await atc.execute(algorand.client.algod, 3)
  
  console.log('Payment acknowledged - trade completed')
}
```

## Frontend Integration

### React Example

```typescript
import { useWallet } from '@txnlab/use-wallet'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AtomicMarketplaceEscrowV4Client } from './contracts/client'

function TradeFlow() {
  const { activeAddress, signTransactions } = useWallet()
  const [tradeId, setTradeId] = useState<number | null>(null)
  
  // Initialize client
  const algorand = AlgorandClient.testNet()
  const escrowClient = new AtomicMarketplaceEscrowV4Client(
    {
      sender: activeAddress,
      resolveBy: 'id',
      id: YOUR_APP_ID,
    },
    algorand.client.algod
  )
  
  // Create trade
  async function handleCreateTrade() {
    try {
      const id = await escrowClient.createTrade({
        sellerAddress: sellerInput,
        originalAmount: Number(amountInput),
        productType: productTypeInput,
        description: descriptionInput,
        ipfsHash: ipfsHashInput,
      })
      
      setTradeId(id)
      toast.success(`Trade created: ${id}`)
    } catch (error) {
      toast.error('Failed to create trade')
      console.error(error)
    }
  }
  
  // Escrow funds
  async function handleEscrow() {
    try {
      const trade = await escrowClient.getTrade({ tradeId: tradeId! })
      const { totalCost } = await escrowClient.calculateEscrowCost({ 
        amount: trade.amount.native 
      })
      
      // Build atomic group
      const atc = new algosdk.AtomicTransactionComposer()
      
      // Add payment transaction
      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: appAddress,
        assetIndex: usdcAssetId,
        amount: Number(totalCost.native),
        suggestedParams: await algorand.client.algod.getTransactionParams().do(),
      })
      
      atc.addTransaction({ 
        txn: paymentTxn, 
        signer: { addr: activeAddress, signTxn: signTransactions } 
      })
      
      // Add escrow call
      await escrowClient.escrowTrade(
        { tradeId: tradeId! },
        { sendParams: { atc } }
      )
      
      // Execute with wallet
      await atc.execute(algorand.client.algod, 3)
      
      toast.success('Funds escrowed successfully')
    } catch (error) {
      toast.error('Escrow failed')
      console.error(error)
    }
  }
  
  return (
    <div>
      <h2>Trade Escrow Flow</h2>
      {/* UI components */}
    </div>
  )
}
```

### Vue Example

```typescript
import { ref } from 'vue'
import { useWallet } from '@txnlab/use-wallet-vue'

export function useTradeEscrow() {
  const { activeAddress, signTransactions } = useWallet()
  const tradeId = ref<number | null>(null)
  const loading = ref(false)
  
  async function createTrade(params) {
    loading.value = true
    try {
      const id = await escrowClient.createTrade(params)
      tradeId.value = id
      return id
    } finally {
      loading.value = false
    }
  }
  
  async function escrowFunds() {
    // Similar to React example
  }
  
  return {
    tradeId,
    loading,
    createTrade,
    escrowFunds,
  }
}
```

## Testing

### Unit Tests

```bash
npm test -- atomic_marketplace_escrow_v4
```

### Integration Tests

```bash
npx ts-node smart_contracts/atomic_marketplace_escrow_v4/example-usage.ts
```

### Manual Testing Checklist

- [ ] Deploy contract to LocalNet
- [ ] Create trade as buyer
- [ ] Escrow funds as buyer
- [ ] Execute trade (verify atomic swap)
- [ ] Acknowledge payment
- [ ] Verify state transitions
- [ ] Test financier escrow
- [ ] Test admin functions
- [ ] Test error cases

## Production Checklist

### Security
- [ ] Audit contract code
- [ ] Test all edge cases
- [ ] Verify atomic transaction groups
- [ ] Test with real wallets (Pera, Lute)
- [ ] Implement rate limiting
- [ ] Add transaction monitoring

### Configuration
- [ ] Set correct USDCa asset ID
- [ ] Configure treasury address
- [ ] Set appropriate fee rates
- [ ] Verify regulator addresses
- [ ] Test amount scaling (divisor)

### Integration
- [ ] Connect to TradeInstrumentRegistry
- [ ] Implement wallet integration
- [ ] Add transaction history
- [ ] Implement notifications
- [ ] Add error handling
- [ ] Implement retry logic

### Monitoring
- [ ] Set up indexer for trade queries
- [ ] Monitor contract balance
- [ ] Track failed transactions
- [ ] Alert on unusual activity
- [ ] Log all state transitions

### Documentation
- [ ] Document API endpoints
- [ ] Create user guide
- [ ] Write operator manual
- [ ] Document error codes
- [ ] Create troubleshooting guide

## Common Issues and Solutions

### Issue: "Transaction rejected"
**Solution**: Verify atomic group order and parameters

### Issue: "Insufficient balance"
**Solution**: Ensure account has enough ALGO for fees + USDCa for payment

### Issue: "Asset not opted in"
**Solution**: Opt into USDCa and instrument NFT before transactions

### Issue: "Wrong state"
**Solution**: Verify trade state before calling methods

### Issue: "Box storage error"
**Solution**: Increase box MBR funding for contract

## Support

For issues and questions:
- Check README.md
- Review example-usage.ts
- Check test.spec.ts for examples
- Contact development team

## Next Steps

1. Deploy to TestNet
2. Test with real wallets
3. Integrate with frontend
4. Conduct security audit
5. Deploy to MainNet

## Additional Resources

- [Algorand Developer Docs](https://developer.algorand.org)
- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [Algorand TypeScript SDK](https://github.com/algorandfoundation/algokit-utils-ts)
- [Trade Finance Guide](./README.md)
