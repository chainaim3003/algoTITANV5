@echo off
echo ========================================
echo   LOCALNET REAL ADDRESSES SETUP GUIDE
echo ========================================
echo.

cd /d "C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-frontend"

echo Testing build first...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ BUILD SUCCESSFUL!
    echo.
    echo 🔥 CRITICAL: MOCK ADDRESSES DETECTED
    echo.
    echo The application is currently using MOCK addresses which cannot execute
    echo real Algorand transactions. For proper LocalNet testing:
    echo.
    echo 📋 LOCALNET SETUP INSTRUCTIONS:
    echo.
    echo 1. START ALGORAND SANDBOX:
    echo    algokit sandbox start
    echo.
    echo 2. GET SANDBOX ACCOUNT INFO:
    echo    algokit sandbox info
    echo.
    echo 3. FUND ACCOUNTS (if needed):
    echo    algokit sandbox fund [address]
    echo.
    echo 4. FOR EACH ROLE, ASSIGN UNIQUE REAL ADDRESS:
    echo    - Go to Admin tab ⚙️
    echo    - Connect to different sandbox address
    echo    - Assign that address to specific role
    echo    - Repeat for all 15 roles
    echo.
    echo 5. SANDBOX ACCOUNT STRUCTURE:
    echo    EXPORTER: Use your primary sandbox address
    echo    CARRIER: Connect to 2nd sandbox address  
    echo    INVESTOR_SMALL_1: Connect to 3rd sandbox address
    echo    INVESTOR_SMALL_2: Connect to 4th sandbox address
    echo    etc.
    echo.
    echo 📌 IMPORTANT NOTES:
    echo - Each role MUST have unique real Algorand address
    echo - Mock addresses starting with "MOCK" will NOT work
    echo - Real addresses are needed for blockchain transactions
    echo - Use LocalKit or Wallet Connect with multiple accounts
    echo.
    echo Starting development server...
    call npm run dev
) else (
    echo ❌ Build failed:
    npx tsc --noEmit
)
