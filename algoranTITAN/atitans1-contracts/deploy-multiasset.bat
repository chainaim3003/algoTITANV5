@echo off
REM Multi-Asset Marketplace Deployment Script for Windows
REM This script will build and deploy your updated marketplace to TestNet

echo ======================================
echo 🚀 Starting Multi-Asset Marketplace Deployment
echo ======================================
echo.

REM Step 1: Navigate to contracts directory
echo 📁 Step 1: Navigating to contracts directory...
cd /d C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-contracts

if %errorlevel% equ 0 (
    echo ✅ Directory found
) else (
    echo ❌ Failed to navigate to directory
    pause
    exit /b 1
)

echo.

REM Step 2: Build contracts
echo 🔨 Step 2: Building contracts...
echo This may take 30-60 seconds...
call npm run build

if %errorlevel% equ 0 (
    echo ✅ Build successful!
) else (
    echo ❌ Build failed. Please check errors above.
    pause
    exit /b 1
)

echo.

REM Step 3: Deploy to TestNet
echo 🌐 Step 3: Deploying to TestNet...
echo Connecting to Algorand TestNet...
call algokit project deploy testnet

if %errorlevel% equ 0 (
    echo.
    echo ======================================
    echo ✅ DEPLOYMENT SUCCESSFUL!
    echo ======================================
    echo.
    echo Your marketplace is now live on TestNet with:
    echo   - Official USDC ^(10458941^) as default
    echo   - Custom USDC ^(746654280^) as optional
    echo   - Full Lute wallet support
    echo.
    echo Next steps:
    echo 1. Note your new App ID from the output above
    echo 2. Update your frontend with the new App ID
    echo 3. Get TestNet USDC from: https://bank.testnet.algorand.network/
    echo 4. Test purchases with Lute wallet
    echo.
) else (
    echo.
    echo ❌ Deployment failed. Please check errors above.
    echo.
    echo Common issues:
    echo   - Deployer account needs more ALGO
    echo   - Network connection issue
    echo   - Contract has compilation errors
    echo.
)

pause
