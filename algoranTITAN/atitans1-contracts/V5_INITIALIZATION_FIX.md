# V5 Initialization Fix - Following V4 Pattern

## Problem
The original `initialize-v5.ts` script was failing with:
```
❌ Initialization failed: fetch failed
TypeError: fetch failed
ECONNREFUSED
```

## Root Cause
The script was using `AlgorandClient.fromEnvironment()` which:
- Tries to read environment variables to determine the network
- Defaults to LocalNet (http://localhost:4001)
- Was attempting to connect to LocalNet even though we wanted TestNet

## Solution - Follow V4's Working Pattern

### What Made V4 Work
Looking at `atomic_marketplace_escrow_v4/deploy.ts`:
```typescript
// V4 used TestNet directly
const algorand = AlgorandClient.testNet()

// V4 loaded mnemonic manually from environment
const deployer = algorand.account.fromMnemonic(process.env.DEPLOYER_MNEMONIC)
```

### Fixed V5 Script
Created `scripts/initialize-v5-testnet.ts`:
```typescript
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load TestNet environment variables explicitly
dotenv.config({ path: path.join(__dirname, '..', '.env.testnet') })

// Use TestNet client directly (like V4)
const algorand = AlgorandClient.testNet()

// Load deployer from environment
const deployer = algorand.account.fromMnemonic(process.env.DEPLOYER_MNEMONIC)
```

## Key Differences

### ❌ Old Approach (Didn't Work)
```typescript
const algorand = AlgorandClient.fromEnvironment()
const deployer = await algorand.account.fromEnvironment('DEPLOYER')
```

### ✅ New Approach (Following V4)
```typescript
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.testnet' })

const algorand = AlgorandClient.testNet()
const deployer = algorand.account.fromMnemonic(process.env.DEPLOYER_MNEMONIC)
```

## How to Run

### Option 1: Batch File (Windows)
```bash
initialize-v5-testnet.bat
```

### Option 2: Direct Command
```bash
npx tsx scripts/initialize-v5-testnet.ts
```

## Expected Output
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

🔍 Verify at: https://testnet.explorer.perawallet.app/application/746822940
```

## What the Script Does

1. **Loads TestNet Configuration**: Explicitly loads `.env.testnet` with TestNet endpoints
2. **Connects to TestNet**: Uses `AlgorandClient.testNet()` for direct TestNet connection
3. **Gets Deployer Account**: Loads mnemonic from `DEPLOYER_MNEMONIC` env variable
4. **Initializes Contract**: Calls the `initialize()` method with:
   - Settlement Asset: 0 (ALGO)
   - Treasury Address: Deployer's address
5. **Sets Default Rates**: Contract sets:
   - Regulator Tax: 5.00%
   - Regulator Refund: 2.00%
   - Marketplace Fee: 0.25%

## AlgoKit Documentation Alignment

This follows the official AlgoKit pattern:
- [AlgoKit Utils Documentation](https://github.com/algorandfoundation/algokit-utils-ts)
- Uses `AlgorandClient.testNet()` for TestNet (from official examples)
- Uses `dotenv` to load environment variables explicitly
- Loads mnemonic manually for account creation

## Next Steps

After successful initialization:
1. ✅ Contract is ready to accept trades
2. ✅ Frontend can connect using App ID: 746822940
3. ✅ Users can create and settle trades with ALGO

## Verification

Check the contract state on TestNet:
```
https://testnet.explorer.perawallet.app/application/746822940
```

You should see:
- Global State with `nextTradeId = 1`
- Global State with `settlementAssetId = 0`
- Global State with treasury address set
