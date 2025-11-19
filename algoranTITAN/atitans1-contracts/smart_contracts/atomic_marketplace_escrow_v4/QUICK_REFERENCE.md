# AtomicMarketplaceEscrowV4 - Quick Reference

## 🚀 Quick Start

```bash
# Navigate to project
cd C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-contracts

# Compile contract
algokit compile py smart_contracts/atomic_marketplace_escrow_v4

# Deploy to LocalNet
algokit localnet start
npx ts-node smart_contracts/atomic_marketplace_escrow_v4/deploy.ts

# Run example
npx ts-node smart_contracts/atomic_marketplace_escrow_v4/example-usage.ts
```

## 📋 State Flow

```
CREATED → ESCROWED → EXECUTED → PAYMENT_ACKNOWLEDGED → COMPLETED
           ↓            ↓              ↓
        EXPIRED ← EXPIRED ← EXPIRED (admin only)
```

## 💰 Fee Structure

| Fee Type | Rate | Paid By | Paid To |
|----------|------|---------|---------|
| Marketplace Fee | 0.25% | Escrow Provider | Platform Treasury |
| Regulator Tax | 5.00% | Seller | Regulator |
| Regulator Refund | 2.00% | Regulator | Seller |

## 🔑 Key Addresses

```typescript
// Demo Configuration
Importer Buyer1:    J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU
Financier Large 1:  7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI

// TestNet USDCa
Asset ID: 10458941

// Amount Divisor
100,000 (amounts divided for demo)
```

## 📝 Common Operations

### 1. Create Trade
```typescript
const tradeId = await escrowClient.createTrade({
  sellerAddress: 'SELLER_ADDR',
  originalAmount: 10000000000,  // Divided by 100,000
  productType: 'Electronics',
  description: 'Laptops',
  ipfsHash: 'QmXXX'
})
```

### 2. Escrow Funds (Buyer)
```typescript
const atc = new AtomicTransactionComposer()

// Payment
atc.addTransaction(makeAssetTransfer({
  from: buyer,
  to: contractAddress,
  assetIndex: usdcAssetId,
  amount: totalCost
}))

// Escrow call
await escrowClient.escrowTrade({ tradeId }, { sendParams: { atc } })
await atc.execute(algod, 3)
```

### 3. Execute Trade (Atomic Swap)
```typescript
const atc = new AtomicTransactionComposer()

// NFT transfer
atc.addTransaction(makeAssetTransfer({
  from: seller, to: buyer,
  assetIndex: instrumentAssetId, amount: 1
}))

// Tax payment
atc.addTransaction(makeAssetTransfer({
  from: seller, to: regulator,
  assetIndex: usdcAssetId, amount: taxAmount
}))

// Execute
await escrowClient.executeTrade({
  tradeId, instrumentAssetId, instrumentTypeNum: 0,
  leiId, leiName, instrumentNumber, regulatorWallet
}, { sendParams: { atc } })

await atc.execute(algod, 3)
```

### 4. Acknowledge Payment
```typescript
const atc = new AtomicTransactionComposer()

// Regulator refund
atc.addTransaction(makeAssetTransfer({
  from: regulator, to: seller,
  assetIndex: usdcAssetId, amount: refundAmount
}))

// Acknowledge
await escrowClient.acknowledgePayment(
  { tradeId },
  { sendParams: { atc } }
)
await atc.execute(algod, 3)
```

## 🔍 Query Functions

```typescript
// Get trade
const trade = await escrowClient.getTrade({ tradeId })

// Get metadata
const meta = await escrowClient.getTradeMetadata({ tradeId })

// Get buyer's trades
const buyerTrades = await escrowClient.getTradesByBuyer({ buyer })

// Get seller's trades
const sellerTrades = await escrowClient.getTradesBySeller({ seller })

// Calculate costs
const { totalCost, fee } = await escrowClient.calculateEscrowCost({ amount })
const { taxAmount, refundAmount } = await escrowClient.calculateRegulatorCosts({ amount })
```

## 🛠️ Admin Functions

```typescript
// Update rates (creator only)
await escrowClient.setRates({
  taxRate: 500,      // 5%
  refundRate: 200,   // 2%
  feeRate: 25        // 0.25%
})

// Expire trade (creator only)
await escrowClient.expireTrade({ tradeId })
```

## 📦 Instrument Types

```typescript
enum InstrumentType {
  BL = 0,               // Bill of Lading
  WAREHOUSE_RECEIPT = 1 // Warehouse Receipt
}
```

## ⚠️ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Trade not in CREATED state" | Wrong state | Check `trade.state` |
| "Only buyer can escrow" | Wrong caller | Use buyer account |
| "Must be group transaction" | Not atomic | Use AtomicTransactionComposer |
| "Incorrect payment amount" | Wrong amount | Use `calculateEscrowCost()` |
| "Asset not opted in" | Missing opt-in | Call `assetOptIn()` first |

## 💡 Best Practices

1. **Always use atomic groups** for multi-transaction operations
2. **Calculate costs before** creating transactions
3. **Opt into assets** before receiving them
4. **Verify trade state** before each operation
5. **Handle errors gracefully** in UI
6. **Monitor contract balance** for inner transactions
7. **Test on LocalNet** before TestNet/MainNet

## 📊 Cost Example

Trade Amount: $10,000 (actual demo: $0.10)

```
Buyer Pays:
  Trade Amount:      100,000 microUSDCa
  Marketplace Fee:       250 microUSDCa
  Total Escrow:      100,250 microUSDCa

Seller Pays:
  Regulator Tax:       5,000 microUSDCa

Seller Receives:
  From Contract:     100,000 microUSDCa
  From Regulator:      2,000 microUSDCa (refund)
  Net Revenue:        97,000 microUSDCa

Platform Receives:
  Marketplace Fee:       250 microUSDCa

Regulator Receives:
  Export Tax:          5,000 microUSDCa
  Pays Refund:        -2,000 microUSDCa
  Net Revenue:         3,000 microUSDCa
```

## 🔗 Useful Links

- [Full Documentation](./README.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Migration Summary](./MIGRATION_SUMMARY.md)
- [Example Usage](./example-usage.ts)
- [Test Suite](./test.spec.ts)

## 📞 Support

For questions or issues:
1. Check documentation files
2. Review example-usage.ts
3. Run tests for examples
4. Contact development team

---

**Version**: 4.0  
**Last Updated**: 2025-10-02  
**Status**: Production Ready ✅
