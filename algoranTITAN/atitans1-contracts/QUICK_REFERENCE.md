# V5 Deployment Quick Reference

## 🚀 Deploy in 3 Steps

### 1. Pre-Check
```bash
pre-deployment-check.bat
```
✅ Verifies environment, balance, and connectivity

### 2. Deploy
```bash
deploy-v5-testnet.bat
```
🎯 Deploys, funds, and initializes contract

### 3. Verify
```bash
verify-v5-state.bat
```
🔍 Confirms contract is ready for trades

---

## 📋 Files You Need

### `.env.testnet`
```bash
ALGOD_SERVER=https://testnet-api.algonode.cloud
INDEXER_SERVER=https://testnet-idx.algonode.cloud
DEPLOYER_MNEMONIC=your 25 word mnemonic here
```

### Frontend `.env.local` (after deployment)
```bash
VITE_ESCROW_APP_ID=[new_app_id]
VITE_NETWORK=testnet
```

---

## 🔧 Commands

| Action | Command |
|--------|---------|
| Check prerequisites | `pre-deployment-check.bat` |
| Deploy to TestNet | `deploy-v5-testnet.bat` |
| Verify contract | `verify-v5-state.bat` |
| Initialize only | `initialize-v5-testnet.bat` |

---

## 📊 What Gets Deployed

- **Contract**: AtomicMarketplaceEscrowV5
- **Network**: Algorand TestNet
- **Settlement**: ALGO (native)
- **Funding**: 0.5 ALGO to contract
- **Treasury**: Deployer address
- **Initial Trade ID**: 1

---

## ⚡ Quick Start

```bash
# From contracts directory
pre-deployment-check.bat
deploy-v5-testnet.bat
verify-v5-state.bat

# Update frontend
cd ../atitans1-frontend
# Edit .env.local with new App ID
npm run dev
```

---

## 🐛 Quick Troubleshooting

| Error | Fix |
|-------|-----|
| "fetch failed" | Use new scripts (deploy-v5-testnet.bat) |
| "DEPLOYER_MNEMONIC not found" | Add to .env.testnet |
| "Insufficient balance" | Get ALGO from https://bank.testnet.algorand.network/ |
| "Contract not found" | Run deployment script first |

---

## 📍 Important URLs

- **TestNet Dispenser**: https://bank.testnet.algorand.network/
- **TestNet Explorer**: https://testnet.explorer.perawallet.app/
- **Contract Explorer**: `https://testnet.explorer.perawallet.app/application/[APP_ID]`

---

## ✅ Success Indicators

After deployment, you should see:
- ✅ New App ID in output
- ✅ `deployment-info-v5-testnet.json` created
- ✅ Verification shows `nextTradeId: 1`
- ✅ Frontend connects successfully
- ✅ First trade created with ID = 1

---

## 📚 Full Documentation

- `V5_DEPLOYMENT_SUMMARY.md` - Complete overview
- `V5_TESTNET_DEPLOYMENT_GUIDE.md` - Detailed guide
- `V5_INITIALIZATION_FIX.md` - Technical details

---

**Need help?** Check the full guides in the docs folder! 🎯
