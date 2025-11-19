@echo off
echo ====================================
echo Deploying V5 Contract to TestNet
echo ====================================
echo.
echo This will:
echo   - Deploy the AtomicMarketplaceEscrowV5 contract
echo   - Fund the contract account
echo   - Initialize the contract with ALGO settlement
echo   - Save deployment info to deployment-info-v5-testnet.json
echo.
pause
echo.
npx tsx scripts/deploy-v5-testnet.ts
echo.
pause
