# V5 TestNet Deployment Guide

## 🚀 Quick Deploy

### Option 1: Use Batch File (Recommended for Windows)
```bash
deploy-v5-testnet.bat
```

### Option 2: Direct Command
```bash
npx tsx scripts/deploy-v5-testnet.ts
```

## 📋 Prerequisites

### 1. Environment Setup
Ensure `.env.testnet` exists with:
```bash
# TestNet API endpoints
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=
ALGOD_TOKEN=

INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_PORT=
INDEXER_TOKEN=

# Deployer account mnemonic (25-word phrase)
DEPLOYER_MNEMONIC=your 25 word mnemonic phrase here
```

### 2. Deployer Account Requirements
- ✅ At least 1-2 ALGO in the account
- ✅ Valid 25-word mnemonic phrase
- ✅ TestNet account (not MainNet)

### 3. Get TestNet ALGO
If you need TestNet ALGO:
1. Visit: https://bank.testnet.algorand.network/
2. Enter your deployer address
3. Request TestNet ALGO (dispenser provides 10 ALGO)

## 🔧 What the Deployment Does

### Step 1: Deploy Contract
- Creates new V5 contract on TestNet
- Generates unique App ID
- Generates App Address for escrow operations

### Step 2: Fund Contract
- Sends 0.5 ALGO to contract address
- Covers Minimum Balance Requirement (MBR)
- Enables inner transactions

### Step 3: Initialize Contract
- Sets `nextTradeId = 1`
- Sets `settlementAssetId = 0` (ALGO)
- Sets `treasuryAddress` = Deployer address
- Sets default rates:
  - Regulator Tax: 5.00%
  - Regulator Refund: 2.00%
  - Marketplace Fee: 0.25%

### Step 4: Save Deployment Info
- Creates `deployment-info-v5-testnet.json`
- Contains App ID, addresses, configuration
- Used by frontend for connection

## 📊 Expected Output

```
====================================
🚀 Deploying Escrow V5 to TestNet...
====================================

📝 Deployer: NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM

💰 Deployer Balance: 5.234567 ALGO

📦 Deploying smart contract...

✅ Contract deployed successfully!

📍 App ID: 746822941
📍 App Address: ABCDEF123456...
📍 Transaction ID: XYZ789...

💰 Funding application account...
✅ Application account funded with 0.5 ALGO

⚙️  Initializing contract...
✅ Contract initialized!

📊 Configuration:
   - Settlement: ALGO (native)
   - Treasury: NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM
   - Next Trade ID: 1

⚖️  Default Rates:
   - Regulator Tax: 5.00%
   - Regulator Refund: 2.00%
   - Marketplace Fee: 0.25%

💾 Deployment Info:
{
  "network": "testnet",
  "appId": 746822941,
  "appAddress": "ABCDEF123456...",
  ...
}

✅ Deployment info saved to: deployment-info-v5-testnet.json

🎉 Escrow V5 is ready for trades!

🔍 View on Explorer: https://testnet.explorer.perawallet.app/application/746822941

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Update frontend .env.local with:
   VITE_ESCROW_APP_ID=746822941
   VITE_NETWORK=testnet

2. Test creating trades in the frontend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 📁 Files Created

### Deployment Info
`deployment-info-v5-testnet.json`:
```json
{
  "network": "testnet",
  "appId": 746822941,
  "appAddress": "O5PNOOQQXP3FR2PYWJQ7TY5FFEUSMXENLFRIFEY6RBDBHPDDJUC4BWDBJ4",
  "deployerAddress": "NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM",
  "treasuryAddress": "NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM",
  "settlementAssetId": 0,
  "deployedAt": "2025-01-06T10:30:00.000Z",
  "explorerUrl": "https://testnet.explorer.perawallet.app/application/746822941",
  "rates": {
    "regulatorTaxRate": 5.0,
    "regulatorRefundRate": 2.0,
    "marketplaceFeeRate": 0.25
  }
}
```

## 🔄 Verify Deployment

After deployment, verify the contract state:

```bash
# Windows
verify-v5-state.bat

# Or directly
npx tsx scripts/verify-v5-state.ts
```

You should see:
- ✅ `nextTradeId: 1`
- ✅ `settlementAssetId: 0`
- ✅ `treasuryAddress: [your address]`
- ✅ Rate constants set

## 🔗 Update Frontend

### 1. Edit `atitans1-frontend/.env.local`
```bash
# Use the App ID from deployment output
VITE_ESCROW_APP_ID=746822941
VITE_NETWORK=testnet
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
```

### 2. Restart Frontend
```bash
cd ../atitans1-frontend
npm run dev
```

### 3. Test Trade Creation
1. Connect your Pera Wallet (TestNet mode)
2. Create a new trade
3. Verify trade ID = 1 appears
4. Check contract on explorer

## 🐛 Troubleshooting

### Error: "fetch failed" or "ECONNREFUSED"
**Cause:** Script trying to connect to LocalNet
**Fix:** Use the new `deploy-v5-testnet.ts` which uses `AlgorandClient.testNet()`

### Error: "DEPLOYER_MNEMONIC not found"
**Cause:** Missing `.env.testnet` file
**Fix:** Create `.env.testnet` with your mnemonic

### Error: "Insufficient balance"
**Cause:** Deployer account has insufficient ALGO
**Fix:** Get TestNet ALGO from https://bank.testnet.algorand.network/

### Error: "Transaction rejected"
**Cause:** Various reasons (fees, parameters, etc.)
**Fix:** Check transaction details in error message and TestNet explorer

### Contract Already Exists
**Note:** If you previously deployed App ID 746822940, this will create a NEW contract with a different App ID. Each deployment creates a fresh contract instance.

## 📊 Contract Specifications

### Global State Schema
- **Integers:** 6 (counters, IDs, rates)
- **Bytes:** 2 (addresses)

### Local State Schema
- None (V5 uses boxes instead of local state)

### Box Storage
- Trade data stored in boxes
- Box naming: `trade_{tradeId}`
- Minimum balance requirement covered by 0.5 ALGO funding

## 🎯 Key Differences from V4

### V4 Initialization
```typescript
// V4 used USDC as settlement
await appClient.initialize({
  defaultUsdcAssetId: 10458941,
  treasuryAddress: treasuryAddress,
})
```

### V5 Initialization
```typescript
// V5 uses configurable settlement (ALGO by default)
await appClient.send.initialize({
  args: {
    settlementAssetId: BigInt(0), // 0 = ALGO
    treasuryAddress: treasuryAddress,
  }
})
```

## 🔐 Security Notes

### Production Deployment
For MainNet deployment:
1. **Use a dedicated treasury account** (not the deployer)
2. **Secure the deployer mnemonic** (hardware wallet recommended)
3. **Test thoroughly on TestNet first**
4. **Review all transaction fees and rates**
5. **Set appropriate settlement asset** (USDC for production?)

### TestNet vs MainNet
- TestNet: For testing and development
- MainNet: For production with real value
- Never use TestNet mnemonics on MainNet
- Never expose MainNet mnemonics in code

## 📚 References

- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [AlgoKit Utils](https://github.com/algorandfoundation/algokit-utils-ts)
- [Algorand TestNet Explorer](https://testnet.explorer.perawallet.app/)
- [TestNet Dispenser](https://bank.testnet.algorand.network/)

## ✅ Deployment Checklist

Before deploying:
- [ ] `.env.testnet` file exists with valid mnemonic
- [ ] Deployer has at least 1-2 TestNet ALGO
- [ ] Contract code is compiled (`npm run build` in contracts directory)
- [ ] You understand deployment creates a NEW contract instance

After deploying:
- [ ] Note the App ID from deployment output
- [ ] Save `deployment-info-v5-testnet.json` file
- [ ] Update frontend `.env.local` with new App ID
- [ ] Verify contract on TestNet explorer
- [ ] Test creating a trade in frontend
- [ ] Confirm trade appears with ID = 1

## 🎉 Success!

After successful deployment, you'll have:
- ✅ New V5 contract deployed on TestNet
- ✅ Contract initialized and ready for trades
- ✅ App ID for frontend integration
- ✅ Deployment info saved for reference
- ✅ Contract funded for operations

Ready to create trades! 🚀
