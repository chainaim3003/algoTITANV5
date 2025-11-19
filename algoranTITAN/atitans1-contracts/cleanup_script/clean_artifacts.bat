@echo off
echo Cleaning Smart Contract Compilation Artifacts...
echo.

REM Navigate to the smart_contracts directory
cd /d "C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-contracts\smart_contracts"

echo Removing artifacts directory...
if exist "artifacts" (
    rmdir /s /q "artifacts"
    echo ✅ Removed artifacts directory
) else (
    echo ⚠️  No artifacts directory found
)

echo.
echo Removing .algokit build cache...
if exist ".algokit" (
    rmdir /s /q ".algokit"
    echo ✅ Removed .algokit cache
) else (
    echo ⚠️  No .algokit cache found
)

echo.
echo Removing node_modules to force clean rebuild...
cd ..
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo ✅ Removed node_modules
) else (
    echo ⚠️  No node_modules found
)

echo.
echo Removing package-lock.json to force clean install...
if exist "package-lock.json" (
    del "package-lock.json"
    echo ✅ Removed package-lock.json
) else (
    echo ⚠️  No package-lock.json found
)

echo.
echo ===============================================
echo 🧹 CLEANUP COMPLETE!
echo.
echo Next steps to rebuild cleanly:
echo 1. npm install
echo 2. algokit compile
echo 3. Check only existing contracts are compiled
echo ===============================================
pause
