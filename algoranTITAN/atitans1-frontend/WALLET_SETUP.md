# 💰 Wallet Setup and Role Creation Guide

## 🎯 Overview
This guide will help you set up multiple Algorand wallets for different roles in the AlgoTITANS V2 platform.

## 📱 Step 1: Install Pera Wallet

### Download Pera Wallet:
- **Mobile**: Search "Pera Wallet" in App Store (iOS) or Google Play (Android)
- **Web Extension**: Visit https://perawallet.app/ → Download Browser Extension
- **Desktop**: Download desktop app from official website

### Initial Setup:
1. **Create New Wallet** or **Import Existing**
2. **Secure Your Seed Phrase** (25 words) - Write it down safely!
3. **Set PIN/Password** for wallet access

## 🌐 Step 2: Configure Network

### Switch to TestNet:
1. Open Pera Wallet
2. Go to **Settings** → **Developer Settings**
3. Enable **TestNet**
4. Switch to **TestNet** network
5. Verify network shows "TestNet" in top bar

## 👥 Step 3: Create Role-Specific Accounts

### Account 1: Exporter Role 🏭
```
Role: Exporter (Tirupur Textiles Ltd)
Purpose: Create and tokenize Bills of Lading
Required Balance: 10 ALGO (for transaction fees)
```

**Setup Steps:**
1. In Pera Wallet, tap **"+"** → **"Add Account"**
2. **Name**: "Exporter - Tirupur Textiles"
3. **Copy Address** (starts with "ALGO...")
4. **Fund Account**: Use TestNet faucet (see Step 4)

### Account 2: MSME Investor Role 💼
```
Role: Small/Medium Investor
Purpose: Invest in tokenized trade finance
Required Balance: 5 ALGO (for investments)
```

**Setup Steps:**
1. Add new account: **"MSME Investor"**
2. Copy address
3. Fund with 5 ALGO from faucet

### Account 3: Carrier Role 🚢 (Optional)
```
Role: Shipping Carrier (Maersk Line)
Purpose: Future BL creation features
Required Balance: 2 ALGO
```

**Setup Steps:**
1. Add new account: **"Carrier - Maersk"**
2. Copy address  
3. Fund with 2 ALGO from faucet

### Account 4: Large Investor Role 💰 (Optional)
```
Role: Institutional Investor
Purpose: Large-scale trade finance investments
Required Balance: 20 ALGO
```

## 💧 Step 4: Fund Your Accounts

### Using TestNet Faucet:
1. **Visit**: https://bank.testnet.algorand.network/
2. **Paste** your wallet address
3. **Click** "Dispense" 
4. **Wait** 10-30 seconds for confirmation
5. **Repeat** for each account you created

### Alternative Method (Dispenser):
1. **Visit**: https://dispenser.testnet.aws.algodev.network/
2. **Enter** your address
3. **Request** 10 ALGO
4. **Confirm** transaction

## 🔗 Step 5: Connect to AlgoTITANS V2

### For Each Role:

#### As Exporter:
1. **Switch** to Exporter account in Pera Wallet
2. **Visit** http://localhost:5173
3. **Click** "Connect Wallet"
4. **Select** Pera Wallet
5. **Approve** connection
6. **Navigate** to "Exporter Dashboard"

#### As Investor:
1. **Switch** to MSME Investor account
2. **Refresh** the web page
3. **Reconnect** wallet
4. **Navigate** to "Investment Marketplace"

## 📊 Step 6: Verify Account Balances

### In Pera Wallet:
- **Exporter Account**: Should show ~10 ALGO
- **Investor Account**: Should show ~5 ALGO
- **Carrier Account**: Should show ~2 ALGO

### In AlgoTITANS Platform:
- **Top Right Corner**: Shows connected wallet address
- **Network Status**: Should display "TestNet"
- **Balance**: Should match Pera Wallet balance

## 🎮 Step 7: Demo Role Play

### Scenario 1: Exporter Workflow
1. **Connect** as Exporter account
2. **View** available Bills of Lading
3. **Tokenize** an Open BL (Negotiable)
4. **Monitor** marketplace listing

### Scenario 2: Investor Workflow  
1. **Switch** to Investor account in Pera Wallet
2. **Refresh** browser and reconnect
3. **Browse** Investment Marketplace
4. **Invest** $50-200 in tokenized BL
5. **Experience** atomic settlement (3 seconds)

### Scenario 3: Cross-Role Experience
1. **As Exporter**: Create Enhanced Financial BL
2. **Switch** to Investor role  
3. **As Investor**: Fund the opportunity
4. **Switch** back to Exporter
5. **Monitor** funding progress in real-time

## 🔧 Troubleshooting

### Wallet Connection Issues:
- **Clear browser cache** and reconnect
- **Disable popup blockers** 
- **Ensure TestNet** is selected in Pera Wallet
- **Try incognito/private** browsing mode

### Transaction Failures:
- **Check ALGO balance** (need minimum 0.1 ALGO for fees)
- **Verify network connectivity**
- **Wait 30 seconds** between transactions

### Account Switching:
- **Change account** in Pera Wallet first
- **Refresh** the web page
- **Reconnect** wallet to see new account

## 📋 Account Summary Template

```
=== ALGOTITANS V2 DEMO ACCOUNTS ===

Exporter Account:
Address: ALGO...
Balance: 10 ALGO
Role: Create & tokenize Bills of Lading

MSME Investor Account:  
Address: ALGO...
Balance: 5 ALGO
Role: Invest in trade finance opportunities

Carrier Account:
Address: ALGO...
Balance: 2 ALGO  
Role: Future BL creation features

Network: TestNet
Platform: http://localhost:5173
Wallet: Pera Wallet
```

## 🎯 Success Criteria

You'll know the setup is successful when:
- ✅ All accounts funded with ALGO
- ✅ Can switch between accounts in Pera Wallet
- ✅ AlgoTITANS recognizes different roles
- ✅ Can view Exporter Dashboard with sample BLs
- ✅ Can access Investment Marketplace
- ✅ Can perform demo transactions (tokenization/investment)

## 🚀 Ready to Explore!

With your wallets set up, you're ready to experience:
- **Revolutionary RWA Tokenization**
- **Atomic Cross-Border Settlement** 
- **MSME-Accessible Trade Finance**
- **Deep DCSA v3.0 Metadata Integration**

Start with the Exporter Dashboard to see the enhanced Bills of Lading, then switch to the Investment Marketplace to experience instant settlement!
