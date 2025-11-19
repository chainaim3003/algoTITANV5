# AlgoTITANS V2 - Enhanced RWA Tokenization Platform

## 🚀 Revolutionary Features

- **Deep DCSA v3 Integration**: Enhanced metadata for precise RWA classification
- **Atomic Settlement**: Instant cross-border financing in ~3 seconds
- **Open vs Straight BL Logic**: Only negotiable BLs can access marketplace financing
- **MSME Access**: $50 minimum investment for global participation
- **IPFS Storage**: Decentralized document repository with ARC-3 compliance
- **Real-time Analytics**: Live funding progress and yield tracking

## 📋 Prerequisites

Before running the application, ensure you have:

1. **Node.js** (version 20.0 or higher)
2. **npm** (version 9.0 or higher)
3. **Algorand Wallet** (Pera, Defly, or Exodus)
4. **Git** for version control

## 🛠️ Setup Instructions

### 1. Navigate to Project Directory
```bash
cd C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-frontend
```

### 2. Install Dependencies
```bash
npm run setup
```
This command will:
- Install all required npm packages
- Generate Algorand app clients
- Set up the development environment

### 3. Configure Environment
Copy the environment template and configure for your network:
```bash
copy .env.template .env
```

Edit the `.env` file to match your preferred network:

**For TestNet (Recommended for Demo):**
```env
VITE_ENVIRONMENT=testnet

# Algod
VITE_ALGOD_TOKEN=""
VITE_ALGOD_SERVER="https://testnet-api.algonode.cloud"
VITE_ALGOD_PORT=""
VITE_ALGOD_NETWORK="testnet"

# Indexer
VITE_INDEXER_TOKEN=""
VITE_INDEXER_SERVER="https://testnet-idx.algonode.cloud"
VITE_INDEXER_PORT=""
```

**For LocalNet (Development):**
```env
VITE_ENVIRONMENT=local

# Algod
VITE_ALGOD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
VITE_ALGOD_SERVER=http://localhost
VITE_ALGOD_PORT=4001
VITE_ALGOD_NETWORK=localnet

# Indexer
VITE_INDEXER_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
VITE_INDEXER_SERVER=http://localhost
VITE_INDEXER_PORT=8980

# KMD
VITE_KMD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
VITE_KMD_SERVER=http://localhost
VITE_KMD_PORT=4002
VITE_KMD_WALLET="unencrypted-default-wallet"
VITE_KMD_PASSWORD=""
```

## 🚀 Starting the Development Server

### Option 1: Standard Development
```bash
npm run dev
```

### Option 2: Fresh Setup (if needed)
```bash
npm run generate:app-clients
npm run dev
```

The application will be available at: **http://localhost:5173**

## 💰 Setting Up Demo Wallets and Roles

### 1. Install Pera Wallet (Recommended)
- Download Pera Wallet from: https://perawallet.app/
- Create a new wallet or import existing
- Switch to TestNet in wallet settings

### 2. Fund Your Wallet Accounts
**TestNet Faucet**: https://bank.testnet.algorand.network/

1. **Copy your wallet address** from Pera Wallet
2. **Visit the faucet** and request 10 ALGO
3. **Wait 30 seconds** for confirmation

### 3. Create Role-Specific Accounts

#### Exporter Role Setup:
1. Create a new account in Pera Wallet
2. Label it "Exporter - Tirupur Textiles"
3. Fund with 10 ALGO from faucet
4. Connect this wallet to AlgoTITANS

#### Investor Role Setup:
1. Create another account in Pera Wallet  
2. Label it "MSME Investor"
3. Fund with 5 ALGO from faucet
4. Use this for marketplace investments

#### Carrier Role Setup (Optional):
1. Create carrier account: "Carrier - Maersk"
2. Fund with 2 ALGO
3. Use for future BL creation features

## 🌐 Application Features

### 📋 Exporter Dashboard
- **View Bills of Lading**: See both Open (financiable) and Straight (non-financiable) BLs
- **DCSA v3 Data**: Deep metadata display for enhanced RWA classification
- **Tokenization**: Convert Open BLs into Enhanced Financial BLs
- **IPFS Integration**: Decentralized document storage
- **Real-time Status**: Live funding progress tracking

### 💰 Investment Marketplace
- **Active Opportunities**: Browse tokenized Bills of Lading
- **MSME Access**: Invest starting from $50
- **Atomic Settlement**: Instant investment processing
- **Portfolio Tracking**: Monitor your investments
- **Live Updates**: Real-time funding progress

### 🔍 Key Differentiators

#### Open vs Straight Bill of Lading Logic:
- ✅ **Open BLs (Negotiable)**: Can be tokenized and financed
- ❌ **Straight BLs (Non-negotiable)**: Cannot access marketplace
- 🎯 **Title Holder**: Exporter holds title after carrier creation

#### Revolutionary Technical Features:
- ⚡ **3-Second Settlement**: vs 60-day traditional financing
- 🌍 **Global Access**: MSME investors from any country
- 📊 **Deep Data**: DCSA v3.0 enhanced metadata
- 🔒 **Decentralized**: IPFS document storage

## 📊 Demo Data

The application includes realistic Bills of Lading:

1. **ALGO-BL-2025-001**: Tirupur Textiles → Hamburg ($150K cotton export)
2. **ALGO-BL-2025-002**: Kerala Spices → Dubai ($75K cardamom shipment)  
3. **ALGO-BL-2025-003**: Shanghai Electronics → LA (Non-financiable straight BL)

## 🔧 Troubleshooting

### Common Issues:

1. **Wallet Connection Issues**:
   - Ensure Pera Wallet is on the correct network (TestNet/LocalNet)
   - Clear browser cache and reconnect
   - Check popup blockers

2. **Transaction Failures**:
   - Verify wallet has sufficient ALGO balance
   - Check network connectivity
   - Ensure you're on the correct Algorand network

3. **Build Errors**:
   ```bash
   npm run generate:app-clients
   npm install
   npm run dev
   ```

4. **Environment Issues**:
   - Verify `.env` file configuration
   - Check network endpoints are accessible
   - Ensure proper port configurations

### Performance Optimization:
- The app uses mock data for demonstration
- Real blockchain interactions are simulated for faster demo experience
- Production deployment would integrate actual Algorand smart contracts

## 📞 Support

For technical issues or questions about the AlgoTITANS V2 platform:
- Check console logs for detailed error messages
- Verify wallet connectivity and network settings
- Ensure all dependencies are properly installed

## 🎯 Next Steps

1. **Connect Wallet**: Use Pera Wallet on TestNet
2. **Explore Exporter Dashboard**: View and tokenize Bills of Lading
3. **Visit Marketplace**: Invest in tokenized trade finance opportunities
4. **Experience Atomic Settlement**: See instant cross-border financing in action

---

**AlgoTITANS V2**: Revolutionizing Trade Finance through Enhanced RWA Tokenization
