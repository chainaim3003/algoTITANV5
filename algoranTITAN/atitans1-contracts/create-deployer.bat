@echo off
echo Creating deployer account for TestNet...
echo.

cd /d "C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-contracts"

echo Running account creation script...
npx ts-node scripts/create-deployer.ts

echo.
echo Done! Your deployer account has been created and configured.
pause
