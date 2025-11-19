# V5 Contract Initialization Guide

## Quick Start

### 1. Initialize the Contract
```bash
# Windows
initialize-v5-testnet.bat

# Linux/Mac
npx tsx scripts/initialize-v5-testnet.ts
```

### 2. Verify Initialization
```bash
# Windows
verify-v5-state.bat

# Linux/Mac
npx tsx scripts/verify-v5-state.ts
```

## What Got Fixed

### The Problem
Original script failed with `ECONNREFUSED` because it tried to connect to LocalNet instead of TestNet.

### The Solution
**We followed the V4 pattern that worked:**

#### ❌ Old Way (Failed)
```typescript
const algorand = AlgorandClient.fromEnvironment()
const deployer = await algorand.account.fromEnvironment('DEPLOYER')
```
This tried to connect to LocalNet by default.

#### ✅ New Way (Works - Following V4)
```typescript
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.testnet' })

const algorand = AlgorandClient.testNet()
const deployer = algorand.account.fromMnemonic(process.env.DEPLOYER_MNEMONIC)
```
This explicitly connects to TestNet.

## Prerequisites

### Environment File
Ensure `.env.testnet` exists with:
```bash
ALGOD_SERVER=https://testnet-api.algonode.cloud
INDEXER_SERVER=https://testnet-idx.algonode.cloud
DEPLOYER_MNEMONIC=your mnemonic here
```

### Deployer Account
The deployer account (from mnemonic) should have:
- ✅ Some TestNet ALGO (for transaction fees)
- ✅ Access to the deployed contract (App ID: 746822940)

## Initialization Process

### Step 1: Run Initialization
```bash
initialize-v5-testnet.bat
```

**What it does:**
1. Loads TestNet configuration from `.env.testnet`
2. Connects to TestNet using `AlgorandClient.testNet()`
3. Gets deployer account from `DEPLOYER_MNEMONIC`
4. Calls `initialize()` method on App ID 746822940
5. Sets settlement currency to ALGO (asset ID 0)
6. Sets treasury to deployer's address
7. Initializes `nextTradeId = 1`
8. Sets default rate constants

**Expected Output:**
```
====================================
🔧 Initializing Escrow V5 on TestNet...
====================================
📝 Deployer: NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM
📍 App ID: 746822940
📍 App Address: O5PNOOQQXP3FR2PYWJQ7TY5FFEUSMXENLFRIFEY6RBDBHPDDJUC4BWDBJ4
💵 Settlement: ALGO (native)
💰 Treasury: NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM

⚙️  Calling initialize method...
✅ Initialize transaction confirmed!
📍 Txn ID: [transaction_id]

✅ Contract initialized successfully!

⚖️  Default Rates (from contract):
   - Regulator Tax: 5.00%
   - Regulator Refund: 2.00%
   - Marketplace Fee: 0.25%

🎉 Escrow V5 is now ready for trades!
```

### Step 2: Verify State
```bash
verify-v5-state.bat
```

**Expected Output:**
```
====================================
🔍 Verifying V5 Contract State...
====================================

📍 App ID: 746822940
📍 App Address: [app address]

📊 Global State:
─────────────────────────────────
nextTradeId: 1
settlementAssetId: 0
treasuryAddress: NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM
regulatorTaxRate: 500
regulatorRefundRate: 200
marketplaceFeeRate: 25
─────────────────────────────────

✅ Contract is INITIALIZED

🎉 Ready to create trades!
```

## Contract Configuration

After initialization, the contract will have:

### Global State
- `nextTradeId`: 1 (ready for first trade)
- `settlementAssetId`: 0 (ALGO)
- `treasuryAddress`: Deployer's address
- `regulatorTaxRate`: 500 (5.00%)
- `regulatorRefundRate`: 200 (2.00%)
- `marketplaceFeeRate`: 25 (0.25%)

### Rate Calculation
Rates are stored as basis points (1 bp = 0.01%):
- 500 = 5.00%
- 200 = 2.00%
- 25 = 0.25%

## Troubleshooting

### Error: "fetch failed"
**Cause:** Script trying to connect to LocalNet instead of TestNet
**Fix:** Use the new `initialize-v5-testnet.ts` script that uses `AlgorandClient.testNet()`

### Error: "DEPLOYER_MNEMONIC not found"
**Cause:** Missing or incorrect `.env.testnet` file
**Fix:** Ensure `.env.testnet` exists with valid `DEPLOYER_MNEMONIC`

### Error: "Contract already initialized"
**Cause:** Contract was already initialized once
**Note:** Initialization can only be called once. Run `verify-v5-state.bat` to check current state.

## Next Steps

After successful initialization:

### 1. Update Frontend Configuration
Edit `atitans1-frontend/.env.local`:
```bash
VITE_ESCROW_APP_ID=746822940
VITE_NETWORK=testnet
```

### 2. Test Trade Creation
Use the frontend to:
1. Connect wallet
2. Create a new trade
3. Verify trade appears with ID = 1

### 3. Monitor Contract
View on TestNet Explorer:
```
https://testnet.explorer.perawallet.app/application/746822940
```

## Files Created

### Scripts
- `scripts/initialize-v5-testnet.ts` - Main initialization script
- `scripts/verify-v5-state.ts` - State verification script

### Batch Files
- `initialize-v5-testnet.bat` - Windows initialization
- `verify-v5-state.bat` - Windows verification

### Documentation
- `V5_INITIALIZATION_FIX.md` - Detailed fix explanation
- `V5_INITIALIZATION_README.md` - This file

## Why This Works

### Following V4's Pattern
The V4 deployment (`atomic_marketplace_escrow_v4/deploy.ts`) successfully used:
```typescript
const algorand = AlgorandClient.testNet()
const deployer = algorand.account.fromMnemonic(process.env.DEPLOYER_MNEMONIC)
```

### AlgoKit Documentation Alignment
This approach follows official AlgoKit patterns:
- Direct network client creation (`testNet()`, `mainNet()`, `localNet()`)
- Manual mnemonic loading for account creation
- Explicit environment variable loading with `dotenv`

### Key Principles
1. **Explicit network selection**: Use specific methods like `testNet()`
2. **Manual configuration loading**: Use `dotenv.config()` explicitly
3. **Direct account creation**: Use `fromMnemonic()` rather than `fromEnvironment()`

## Support

If you encounter issues:
1. Check `.env.testnet` configuration
2. Verify deployer has TestNet ALGO
3. Run `verify-v5-state.bat` to check current state
4. Check TestNet Explorer for contract details

## References

- [AlgoKit Utils Documentation](https://github.com/algorandfoundation/algokit-utils-ts)
- [Algorand TestNet Explorer](https://testnet.explorer.perawallet.app/)
- [AlgoKit CLI Documentation](https://github.com/algorandfoundation/algokit-cli)
