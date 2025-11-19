# 🚀 Quick Deployment Guide - Multi-Asset Marketplace

## What Changed?
Your AtomicMarketplaceV3 now supports multiple USDC payment options:
- ✅ Official TestNet USDC (10458941) - **DEFAULT**
- ✅ Custom Test USDC (746654280) - **OPTIONAL**
- ✅ Works with Lute wallet and all Algorand wallets

---

## Deployment Commands

### 1. Build Updated Contract
```bash
cd C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-contracts
npm run build
```

### 2. Deploy to TestNet
```bash
algokit project deploy testnet
```

### 3. Expected Output
```
🚀 Deploying Atomic Marketplace V3 with Multi-Asset Support...
📡 Network: TestNet
💵 Default USDC Asset ID: 10458941
   TestNet Official USDC
🔧 Initializing marketplace with official USDC...
✅ Marketplace initialized with official USDC: 10458941
🔧 Adding custom test USDC as alternative payment option...
✅ Custom USDC added as payment option: 746654280
💰 App account funded with 1 ALGO
✅ AtomicMarketplaceV3 deployed successfully!
📍 App ID: [YOUR_APP_ID]
📍 App Address: [YOUR_APP_ADDRESS]
💵 Accepted Payment Assets:
   - Default: Official USDC (10458941)
   - Optional: Custom USDC (746654280)
   - ALGO (native)

🎉 Marketplace ready for Lute wallet and all Algorand wallets!
```

---

## Testing the Marketplace

### 1. Get Official TestNet USDC
- Open Lute wallet (https://lute.app/)
- Copy your TestNet address
- Visit: https://bank.testnet.algorand.network/
- Sign in with Google
- Select **USDC** (Asset ID 10458941)
- Get 100 USDC (refreshes every 24 hours)

### 2. Opt-in to USDC
In Lute wallet:
- Go to Assets
- Add Asset: 10458941
- Confirm opt-in (costs 0.001 ALGO)

### 3. Test Purchase Flow
```typescript
// List an instrument
await appClient.send.listInstrument({
  args: {
    instrumentId: YOUR_INSTRUMENT_ASSET_ID,
    askPriceAlgo: 0,
    askPriceUSDC: 100_000000, // 100 USDC (6 decimals)
    validityPeriod: 86400 // 24 hours
  }
})

// Buy with official USDC (default)
await appClient.send.purchaseWithUSDC({
  args: {
    listingId: 1,
    payment: usdcPaymentTxn // Asset 10458941
  }
})
```

---

## New Contract Methods

### Check Accepted Assets
```typescript
const isAccepted = await appClient.send.isPaymentAssetAccepted({
  args: { assetId: 10458941 }
})
// Returns: true
```

### Get Default USDC
```typescript
const defaultUsdc = await appClient.send.getDefaultUsdcAssetId()
// Returns: 10458941
```

### Add New Payment Asset (Creator Only)
```typescript
await appClient.send.addPaymentAsset({
  args: { assetId: SOME_OTHER_ASSET_ID }
})
```

### Remove Payment Asset (Creator Only)
```typescript
await appClient.send.removePaymentAsset({
  args: { assetId: 746654280 } // Cannot remove default
})
```

---

## Asset IDs Reference

| Asset | TestNet ID | MainNet ID | Source |
|-------|-----------|-----------|---------|
| **Official USDC** | 10458941 | 31566704 | Circle |
| **Custom USDC** | 746654280 | N/A | Your Contract |

---

## Troubleshooting

### Issue: "Payment asset not accepted"
**Solution:** The asset is not in the accepted list. Add it using `addPaymentAsset()`

### Issue: "Cannot remove default USDC"
**Solution:** This is by design - default USDC (10458941) cannot be removed

### Issue: Lute wallet doesn't show USDC
**Solution:** Opt-in to asset 10458941 in the wallet first

### Issue: "Asset does not exist"
**Solution:** Make sure you're on TestNet, not LocalNet

---

## Quick Verification Checklist

After deployment, verify:
- [ ] Contract deployed successfully
- [ ] Default USDC is 10458941
- [ ] Custom USDC (746654280) added as option
- [ ] App account funded with 1 ALGO
- [ ] Can query accepted payment assets
- [ ] Lute wallet can connect and pay with official USDC

---

## Frontend Integration Snippet

```typescript
// Configure payment options for UI
const PAYMENT_OPTIONS = {
  official: {
    assetId: 10458941,
    name: "USDC (Official)",
    symbol: "USDC",
    decimals: 6,
    default: true,
    faucet: "https://bank.testnet.algorand.network/"
  },
  custom: {
    assetId: 746654280,
    name: "USDC (Test)",
    symbol: "USDC",
    decimals: 6,
    default: false,
    faucet: null
  }
}

// Default to official USDC in UI
const [selectedPayment, setSelectedPayment] = useState(PAYMENT_OPTIONS.official)
```

---

## Files Modified

1. ✅ `smart_contracts/atomic_marketplace_v3/AtomicMarketplaceV3.algo.ts`
2. ✅ `smart_contracts/atomic_marketplace_v3/deploy-config.ts`

Backup created: `AtomicMarketplaceV3.algo.ts.backup`

---

## Support

If you encounter any issues:
1. Check the contract is compiled: `npm run build`
2. Verify you're on TestNet: Check `.env.testnet`
3. Ensure deployer has ALGO: Need ~2-3 ALGO for deployment
4. Check asset IDs match: 10458941 for TestNet

---

**Ready to Deploy!** 🚀

Run: `algokit project deploy testnet`
