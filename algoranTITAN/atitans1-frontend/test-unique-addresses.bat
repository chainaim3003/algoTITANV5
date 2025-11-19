@echo off
echo ========================================
echo   UNIQUE ADDRESS MANAGEMENT SYSTEM
echo ========================================
echo.

cd /d "C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-frontend"

echo Testing build with address management fixes...
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ BUILD SUCCESSFUL!
    echo.
    echo Address Management Features:
    echo    🔄 Prevents multiple roles sharing same address
    echo    🎲 Generate mock unique addresses for testing
    echo    ⚠️ Warning when address already used
    echo    🔍 Clear role assignment conflicts
    echo    📊 Enhanced admin dashboard
    echo.
    echo INSTRUCTIONS FOR FIXING ADDRESS CONFLICTS:
    echo.
    echo 1. Go to Admin tab ⚙️
    echo 2. Click "Generate Unique Addresses" button 🎲  
    echo 3. This will assign unique mock addresses to all roles
    echo 4. Check the Role Assignments table to verify
    echo 5. Each role should now have a different address
    echo.
    echo Starting development server...
    call npm run dev
) else (
    echo.
    echo ❌ Build failed:
    npx tsc --noEmit
)
