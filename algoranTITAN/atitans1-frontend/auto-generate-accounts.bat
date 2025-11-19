@echo off
echo ========================================
echo  AUTOMATIC LOCALNET ACCOUNT GENERATION
echo ========================================
echo.

cd /d "C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-frontend"

echo Testing build...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ BUILD SUCCESSFUL!
    echo.
    echo 🎯 SIMPLIFIED ADMIN DASHBOARD:
    echo    - Single button: "Generate All LocalNet Accounts"
    echo    - Automatically creates 15 unique Algorand addresses
    echo    - Funds each account with 100 ALGO
    echo    - Assigns addresses to specific roles
    echo    - Export functionality for account data
    echo.
    echo 🚀 USAGE:
    echo    1. Go to Admin tab ⚙️
    echo    2. Click "Generate All LocalNet Accounts" 🎲
    echo    3. Wait for generation and funding to complete
    echo    4. All roles now have unique real addresses
    echo    5. Export account data if needed 📥
    echo.
    echo ✨ RESULT: Ready for real blockchain transactions!
    echo.
    call npm run dev
) else (
    echo ❌ Build failed:
    npx tsc --noEmit
)
