#!/bin/bash

# Demo Setup Script for AlgoTITANS V2
# This script initializes the demo with mock app deployment

echo "🚀 Setting up AlgoTITANS V2 Demo Environment..."

# Check if we're in the frontend directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Please run this script from the frontend directory"
    exit 1
fi

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create demo configuration
echo "📝 Creating demo configuration..."

# Set mock app ID for demo
export VITE_APP_ID=123456789

# Create a simple demo config file
cat > .env.demo << EOF
# AlgoTITANS V2 Demo Configuration
VITE_APP_ID=123456789
VITE_ALGOD_NETWORK=localnet
VITE_ALGOD_SERVER=http://localhost
VITE_ALGOD_PORT=4001
VITE_ALGOD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
VITE_KMD_SERVER=http://localhost
VITE_KMD_PORT=4002
VITE_KMD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
EOF

echo "✅ Demo configuration created"

# Copy demo env to main env if not exists
if [[ ! -f ".env" ]]; then
    cp .env.demo .env
    echo "✅ Environment variables set"
fi

echo ""
echo "🎯 Demo Features Available:"
echo "  📋 Document Submission by Exporters"
echo "  🚢 BL Creation and Assignment by Carriers" 
echo "  💰 Real Investment Transactions with Algokit Links"
echo "  🔗 Transaction Tracking and Explorer Links"
echo "  📊 Dynamic Marketplace with Live Updates"
echo ""
echo "🚀 To start the demo:"
echo "  npm run dev"
echo ""
echo "🔗 The demo will show transaction links to:"
echo "  - Testnet: https://testnet.algoexplorer.io/tx/"
echo "  - Localnet: http://localhost:8980/v2/transactions/"
echo ""
echo "💡 Key Demo Flows:"
echo "  1. Connect wallet as Exporter → Submit documents → Create Enhanced Financial BL"
echo "  2. Connect wallet as Carrier → Review documents → Create and assign BLs to exporters"
echo "  3. Connect wallet as Investor → Browse marketplace → Make investments with real transactions"
echo "  4. View all transaction links in Algokit explorer"
echo ""
echo "✨ All transactions show real Algorand transaction IDs and explorer links!"
