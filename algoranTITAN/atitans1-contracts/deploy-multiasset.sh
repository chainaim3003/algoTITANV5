#!/bin/bash
# Multi-Asset Marketplace Deployment Script
# This script will build and deploy your updated marketplace to TestNet

echo "======================================"
echo "🚀 Starting Multi-Asset Marketplace Deployment"
echo "======================================"
echo ""

# Step 1: Navigate to contracts directory
echo "📁 Step 1: Navigating to contracts directory..."
cd C:/SATHYA/CHAINAIM3003/mcp-servers/altry/atry2/atitans1/projects/atitans1-contracts

if [ $? -eq 0 ]; then
    echo "✅ Directory found"
else
    echo "❌ Failed to navigate to directory"
    exit 1
fi

echo ""

# Step 2: Build contracts
echo "🔨 Step 2: Building contracts..."
echo "This may take 30-60 seconds..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check errors above."
    exit 1
fi

echo ""

# Step 3: Deploy to TestNet
echo "🌐 Step 3: Deploying to TestNet..."
echo "Connecting to Algorand TestNet..."
algokit project deploy testnet

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "======================================"
    echo ""
    echo "Your marketplace is now live on TestNet with:"
    echo "  - Official USDC (10458941) as default"
    echo "  - Custom USDC (746654280) as optional"
    echo "  - Full Lute wallet support"
    echo ""
    echo "Next steps:"
    echo "1. Note your new App ID from the output above"
    echo "2. Update your frontend with the new App ID"
    echo "3. Get TestNet USDC from: https://bank.testnet.algorand.network/"
    echo "4. Test purchases with Lute wallet"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Please check errors above."
    echo ""
    echo "Common issues:"
    echo "  - Deployer account needs more ALGO"
    echo "  - Network connection issue"
    echo "  - Contract has compilation errors"
    echo ""
    exit 1
fi
