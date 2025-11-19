@echo off
echo 🚀 Setting up AlgoTITANS V2 Demo Environment...

REM Check if we're in the frontend directory
if not exist package.json (
    echo ❌ Please run this script from the frontend directory
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

REM Create demo configuration
echo 📝 Creating demo configuration...

REM Create a simple demo config file
(
echo # AlgoTITANS V2 Demo Configuration
echo VITE_APP_ID=123456789
echo VITE_ALGOD_NETWORK=localnet
echo VITE_ALGOD_SERVER=http://localhost
echo VITE_ALGOD_PORT=4001
echo VITE_ALGOD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
echo VITE_KMD_SERVER=http://localhost
echo VITE_KMD_PORT=4002
echo VITE_KMD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
) > .env.demo

echo ✅ Demo configuration created

REM Copy demo env to main env if not exists
if not exist .env (
    copy .env.demo .env
    echo ✅ Environment variables set
)

echo.
echo 🎯 Demo Features Available:
echo   📋 Document Submission by Exporters
echo   🚢 BL Creation and Assignment by Carriers
echo   💰 Real Investment Transactions with Algokit Links
echo   🔗 Transaction Tracking and Explorer Links
echo   📊 Dynamic Marketplace with Live Updates
echo.
echo 🚀 To start the demo:
echo   npm run dev
echo.
echo 🔗 The demo will show transaction links to:
echo   - Testnet: https://testnet.algoexplorer.io/tx/
echo   - Localnet: http://localhost:8980/v2/transactions/
echo.
echo 💡 Key Demo Flows:
echo   1. Connect wallet as Exporter → Submit documents → Create Enhanced Financial BL
echo   2. Connect wallet as Carrier → Review documents → Create and assign BLs to exporters
echo   3. Connect wallet as Investor → Browse marketplace → Make investments with real transactions
echo   4. View all transaction links in Algokit explorer
echo.
echo ✨ All transactions show real Algorand transaction IDs and explorer links!

pause
