# Atomic Marketplace Escrow V5

## Overview

AtomicMarketplaceEscrowV5 is the latest version of the Algorand smart contract that implements a trade escrow system for Real-World Asset (RWA) trading. This version includes all the features from V4 with proper naming consistency.

## What's New in V5

- **Fixed Naming**: Contract class name now matches folder structure (V5 instead of V4)
- **Clean Deployment**: Resolved box name encoding issues
- **Consistent Artifacts**: Generated files now properly reference V5

## Key Features

### 1. **State-Based Trade Flow**
- CREATED → ESCROWED → EXECUTED → PAYMENT_ACKNOWLEDGED → COMPLETED
- EXPIRED state for admin cancellations

### 2. **Flexible Settlement Currency**
- Support for ALGO (native) or any ASA (e.g., USDCa)
- Can be changed by admin after deployment
- UI automatically adapts based on settlement currency

### 3. **RWA Instrument Support**
- Bills of Lading (BL)
- Warehouse Receipts
- Atomic transfer with payment

### 4. **Multi-Party Escrow**
- **Buyer-funded**: Buyer escrows, instrument goes to buyer
- **Financier-funded**: Third party escrows, instrument held by marketplace

### 5. **Regulatory Compliance**
- 5% export tax (configurable)
- 2% regulator refund (configurable)
- 0.25% marketplace fee (configurable)

## Quick Start

### 1. Deploy Contract

```bash
cd C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-contracts

# Compile
npm run build

# Deploy
npm run deploy atomic_marketplace_escrow_v5
```

### 2. Initialize

The contract will be automatically initialized during deployment with:
- Settlement Currency: ALGO (0) by default
- Treasury: Deployer address
- Default rates set

### 3. Create a Trade

```typescript
const tradeId = await escrowClient.createTrade({
  sellerAddress: 'SELLER_ADDRESS',
  amount: 500000,  // 0.5 ALGO or 0.5 microASA
  productType: 'Electronics',
  description: 'Laptop shipment',
  ipfsHash: 'QmIPFShash'
})
```

### 4. Escrow Funds (ALGO)

```typescript
// Buyer escrows
await escrowClient.escrowTrade(paymentTxn, tradeId)

// OR Financier escrows
await escrowClient.escrowTradeAsFinancier(paymentTxn, tradeId)
```

### 5. Escrow Funds (ASA)

```typescript
// Buyer escrows
await escrowClient.escrowTradeWithAsset(assetTxn, tradeId)

// OR Financier escrows
await escrowClient.escrowTradeAsFinancierWithAsset(assetTxn, tradeId)
```

### 6. Execute Trade (ALGO)

```typescript
await escrowClient.executeTrade(
  instrumentTxn,     // NFT transfer
  regulatorPayment,  // Tax payment
  tradeId,
  instrumentAssetId,
  instrumentType,
  leiId,
  leiName,
  instrumentNumber,
  regulatorWallet
)
```

### 7. Execute Trade (ASA)

```typescript
await escrowClient.executeTradeWithAsset(
  instrumentTxn,           // NFT transfer
  regulatorAssetPayment,   // Tax payment in ASA
  tradeId,
  instrumentAssetId,
  instrumentType,
  leiId,
  leiName,
  instrumentNumber,
  regulatorWallet
)
```

### 8. Acknowledge Payment (ALGO)

```typescript
await escrowClient.acknowledgePayment(regulatorRefund, tradeId)
```

### 9. Acknowledge Payment (ASA)

```typescript
await escrowClient.acknowledgePaymentWithAsset(regulatorRefund, tradeId)
```

## Settlement Currency

The contract supports both ALGO and ASA settlement:

- **0 = ALGO** (native Algorand currency)
- **Asset ID > 0 = ASA** (e.g., 10458941 for USDCa on TestNet)

### Change Settlement Currency

```bash
# Edit change-settlement.ts to set NEW_SETTLEMENT_CURRENCY
# Then run:
ts-node smart_contracts/atomic_marketplace_escrow_v5/change-settlement.ts
```

## Admin Functions

### Set Rates (Creator Only)

```typescript
await escrowClient.setRates({
  taxRate: 500,      // 5.00%
  refundRate: 200,   // 2.00%
  feeRate: 25        // 0.25%
})
```

### Expire Trade (Creator Only)

```typescript
await escrowClient.expireTrade(tradeId)
```

## View Functions

### Get Trade Details

```typescript
const trade = await escrowClient.getTrade(tradeId)
const metadata = await escrowClient.getTradeMetadata(tradeId)
```

### Get Trades by User

```typescript
const buyerTrades = await escrowClient.getTradesByBuyer(buyerAddress)
const sellerTrades = await escrowClient.getTradesBySeller(sellerAddress)
```

### Calculate Costs

```typescript
const [totalCost, fee] = await escrowClient.calculateEscrowCost(amount)
const [taxAmount, refundAmount] = await escrowClient.calculateRegulatorCosts(amount)
```

### Get Payment Configuration

```typescript
const [assetId, isAlgo] = await escrowClient.getPaymentConfig()
```

## Files

- **AtomicMarketplaceEscrowV5.algo.ts** - Main contract code
- **deploy-config.ts** - Deployment configuration
- **change-settlement.ts** - Script to change settlement currency

## Migration from V4

If you're migrating from V4:

1. V4 folder can remain as backup
2. V5 has the same functionality with correct naming
3. Deploy V5 as a new contract
4. Update frontend to use new app ID and artifacts
5. Existing V4 trades can complete normally

## Support

For questions or issues:
- Review the contract code
- Check the deployment logs
- Consult the main project documentation

## Version History

- **V5.0** - Fixed naming consistency, clean deployment
- **V4.0** - Added flexible settlement currency
- **V3.0** - Initial Algorand implementation

---

**Status**: Ready for TestNet deployment ✅
