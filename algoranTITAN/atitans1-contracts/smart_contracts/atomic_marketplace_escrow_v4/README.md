# Atomic Marketplace Escrow V4

## Overview

AtomicMarketplaceEscrowV4 is an Algorand smart contract that implements a trade escrow system with state management, matching the functionality of the Solidity AdvancedEscrowV2 contract. It handles Real-World Asset (RWA) instruments like Bills of Lading (BL) and Warehouse Receipts atomically with USDCa stablecoin payments.

## Key Features

### 1. **State-Based Trade Flow**
Implements the same state transitions as AdvancedEscrowV2.sol:
- **CREATED** → Trade initiated by buyer
- **ESCROWED** → Funds locked in escrow (by buyer or financier)
- **EXECUTED** → Seller transfers instrument, receives payment
- **PAYMENT_ACKNOWLEDGED** → Seller confirms payment receipt
- **COMPLETED** → Trade finalized
- **EXPIRED** → Trade cancelled (admin action)

### 2. **RWA Instrument Support**
- Bills of Lading (BL)
- Warehouse Receipts
- Instruments are Algorand Standard Assets (ASAs/NFTs)
- Atomic transfer from seller to buyer/marketplace

### 3. **Multi-Party Escrow**
- **Buyer-funded**: Buyer provides escrow, instrument goes to buyer
- **Financier-funded**: Third party provides escrow, instrument stays with marketplace
- Prevents buyer/seller from acting as financier

### 4. **Regulatory Compliance**
- 5% export tax paid by seller to regulator
- 2% refund from regulator to seller
- All transactions tracked and auditable

### 5. **Marketplace Fees**
- 0.25% marketplace fee (configurable)
- Automatically collected during escrow
- Paid to platform treasury upon execution

### 6. **Demo Configuration**
- Amounts automatically divided by 100,000 for minimal USDCa movement
- Pre-configured wallet addresses:
  - **Importer Buyer1**: `J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU`
  - **Financier Large 1**: `7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI`

## Contract Architecture

### Data Structures

#### TradeEscrow
```typescript
{
  tradeId: uint64
  buyer: Address
  seller: Address
  escrowProvider: Address
  paymentToken: uint64
  amount: uint64
  state: uint64
  createdAt: uint64
  
  // RWA Instrument fields
  instrumentAssetId: uint64
  instrumentType: uint64
  instrumentValue: uint64
  
  // Regulator fields
  regulatorWallet: Address
  regulatorTaxPaid: uint64
  regulatorRefundDue: uint64
  
  // Fees
  marketplaceFee: uint64
}
```

#### TradeMetadata
```typescript
{
  productType: string
  description: string
  ipfsHash: string
  leiId: string
  leiName: string
  instrumentNumber: string
}
```

## Usage Guide

### 1. Initialize Contract

```typescript
await appClient.initialize({
  defaultUsdcAssetId: 10458941, // TestNet USDCa
  treasuryAddress: 'TREASURY_ADDRESS'
})
```

### 2. Create Trade (Buyer)

```typescript
const tradeId = await appClient.createTrade({
  sellerAddress: 'SELLER_ADDRESS',
  originalAmount: 10000000000, // Will be divided by 100,000 = 100,000 microUSDCa
  productType: 'Electronics',
  description: 'Computer hardware shipment',
  ipfsHash: 'QmXXXXXX...'
})
```

### 3. Escrow Trade (Buyer or Financier)

#### Option A: Buyer Escrows (instrument goes to buyer)
```typescript
// Group transaction:
// [0] Asset transfer: buyer sends USDCa to contract
// [1] App call: escrowTrade

const { amount, fee } = await appClient.calculateEscrowCost({ amount: 100000 })

await algosdk.makeAtomicTransactionComposerGroup([
  // Transfer payment
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: buyerAddress,
    to: contractAddress,
    assetIndex: usdcAssetId,
    amount: amount + fee,
    suggestedParams
  }),
  // Call escrowTrade
  await appClient.escrowTrade({ tradeId })
])
```

#### Option B: Financier Escrows (instrument stays with marketplace)
```typescript
// Same as above but call escrowTradeAsFinancier
await appClient.escrowTradeAsFinancier({ tradeId })
```

### 4. Execute Trade (Seller)

```typescript
// Group transaction:
// [0] Asset transfer: seller sends instrument NFT
// [1] Asset transfer: seller pays regulator tax
// [2] App call: executeTrade

await algosdk.makeAtomicTransactionComposerGroup([
  // Transfer instrument NFT
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: sellerAddress,
    to: buyerAddress, // or contractAddress if financier-funded
    assetIndex: instrumentAssetId,
    amount: 1,
    suggestedParams
  }),
  // Pay regulator tax
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: sellerAddress,
    to: regulatorAddress,
    assetIndex: usdcAssetId,
    amount: taxAmount,
    suggestedParams
  }),
  // Execute trade
  await appClient.executeTrade({
    tradeId,
    instrumentAssetId,
    instrumentTypeNum: 0, // 0=BL, 1=WarehouseReceipt
    leiId: 'LEI-123456',
    leiName: 'Acme Trading Corp',
    instrumentNumber: 'BL-1001',
    regulatorWallet: 'REGULATOR_ADDRESS'
  })
])
```

### 5. Acknowledge Payment (Seller)

```typescript
// Group transaction:
// [0] Asset transfer: regulator sends refund to seller
// [1] App call: acknowledgePayment

await algosdk.makeAtomicTransactionComposerGroup([
  // Regulator refund
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: regulatorAddress,
    to: sellerAddress,
    assetIndex: usdcAssetId,
    amount: refundAmount,
    suggestedParams
  }),
  // Acknowledge payment
  await appClient.acknowledgePayment({ tradeId })
])
```

## State Transition Flow

```
┌─────────┐
│ CREATED │ ◄── createTrade()
└────┬────┘
     │
     │ escrowTrade() or escrowTradeAsFinancier()
     │
     ▼
┌──────────┐
│ ESCROWED │
└────┬─────┘
     │
     │ executeTrade()
     │
     ▼
┌──────────┐
│ EXECUTED │
└────┬─────┘
     │
     │ acknowledgePayment()
     │
     ▼
┌─────────────────────┐
│ PAYMENT_ACKNOWLEDGED│
└─────────┬───────────┘
          │
          │ (auto)
          │
          ▼
     ┌───────────┐
     │ COMPLETED │
     └───────────┘
```

## Payment Flows

### Buyer-Funded Escrow
```
1. Buyer → Contract (amount + fee)
2. Contract → Treasury (fee)
3. Contract → Seller (amount)
4. Seller → Regulator (5% tax)
5. Regulator → Seller (2% refund)
6. Seller → Buyer (instrument NFT)
```

### Financier-Funded Escrow
```
1. Financier → Contract (amount + fee)
2. Contract → Treasury (fee)
3. Contract → Seller (amount)
4. Seller → Regulator (5% tax)
5. Regulator → Seller (2% refund)
6. Seller → Marketplace (instrument NFT)
```

## View Functions

### Get Trade Details
```typescript
const trade = await appClient.getTrade({ tradeId })
```

### Get Trade Metadata
```typescript
const metadata = await appClient.getTradeMetadata({ tradeId })
```

### Get Buyer's Trades
```typescript
const tradeIds = await appClient.getTradesByBuyer({ 
  buyer: 'BUYER_ADDRESS' 
})
```

### Get Seller's Trades
```typescript
const tradeIds = await appClient.getTradesBySeller({ 
  seller: 'SELLER_ADDRESS' 
})
```

### Calculate Costs
```typescript
// Escrow cost (amount + marketplace fee)
const { totalCost, fee } = await appClient.calculateEscrowCost({ 
  amount: 100000 
})

// Regulator costs
const { taxAmount, refundAmount } = await appClient.calculateRegulatorCosts({ 
  amount: 100000 
})
```

### Get Demo Configuration
```typescript
const { importerBuyer1, financierLarge1, amountDivisor } = 
  await appClient.getDemoConfig()
```

## Admin Functions

### Set Rates
```typescript
await appClient.setRates({
  taxRate: 500,      // 5%
  refundRate: 200,   // 2%
  feeRate: 25        // 0.25%
})
```

### Expire Trade
```typescript
await appClient.expireTrade({ tradeId })
```

## Integration with TradeInstrumentRegistry

This contract works seamlessly with the TradeInstrumentRegistryV3 contract:

1. **Create Instrument** in registry (seller gets NFT)
2. **Create Trade** in escrow (buyer initiates)
3. **Escrow Funds** (buyer or financier)
4. **Execute Trade** atomically transfers instrument + payment
5. **Acknowledge Payment** finalizes the trade

## Security Features

1. **Atomic Transactions**: All critical operations use grouped transactions
2. **State Validation**: Each function validates the current trade state
3. **Role Checks**: Only authorized parties can perform specific actions
4. **Amount Validation**: All payment amounts are verified in atomic groups
5. **Reentrancy Protection**: Contract state updated before external calls

## Gas Optimization

- Uses box storage for efficient data management
- Minimal global state usage
- Indexed queries for buyer/seller lookups
- Batch operations where possible

## Comparison with Solidity Contract

| Feature | Solidity AdvancedEscrowV2 | Algorand EscrowV4 |
|---------|---------------------------|-------------------|
| State Management | ✅ 6 states | ✅ 6 states (identical) |
| Multi-token Support | ✅ ERC20 | ✅ ASA |
| Escrow Providers | ✅ Buyer/Financier | ✅ Buyer/Financier |
| Regulatory Compliance | ✅ Tax/Refund | ✅ Tax/Refund |
| Marketplace Fees | ✅ 0.25% | ✅ 0.25% |
| RWA Instruments | ✅ ERC721 | ✅ ASA/NFT |
| Atomic Swaps | ⚠️ Multi-step | ✅ Native atomic groups |
| Demo Amount Scaling | ✅ /100,000 | ✅ /100,000 |

## Testing

### Local Testing
```bash
# Start LocalNet
algokit localnet start

# Deploy contract
npm run deploy:local

# Run tests
npm test
```

### TestNet Deployment
```bash
# Deploy to TestNet
npm run deploy:testnet

# Verify deployment
npm run verify:testnet
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Trade not in CREATED state" | Escrow already locked | Check trade state |
| "Only buyer can escrow" | Wrong caller | Use buyer account |
| "Incorrect payment amount" | Wrong USDCa amount | Calculate using `calculateEscrowCost` |
| "Must be group transaction" | Missing atomic group | Use atomic transaction composer |
| "Wrong payment token" | Wrong ASA | Use configured USDCa asset |

## Future Enhancements

- Multi-currency support
- Partial payments
- Trade amendments
- Dispute resolution
- Insurance integration
- Automated compliance checks

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Link to repo]
- Documentation: [Link to docs]
- Discord: [Link to community]
