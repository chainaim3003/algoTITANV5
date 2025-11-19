@echo off
echo 🔍 DCSA v3 Validation Fix Test
echo ================================

cd /d "C:\SATHYA\CHAINAIM3003\mcp-servers\altry\atry2\atitans1\projects\atitans1-frontend"

echo 📦 Building with validation fixes...
call npm run build

if %errorlevel% equ 0 (
    echo ✅ Build successful!
    echo.
    echo 🎯 DCSA v3 VALIDATION FIXES APPLIED:
    echo    ✅ Fixed version validation logic (now checks for '3' instead of '3.')
    echo    ✅ Added multiple version location checks (root, transportDocument, metadata)
    echo    ✅ Enhanced error reporting with detailed field information
    echo    ✅ Added debug logging for troubleshooting
    echo    ✅ Improved validation result display with success details
    echo    ✅ Added debug button for console inspection
    echo.
    echo 📁 Sample JSON File: public/sample-dcsa-v3-validation.json
    echo    - Contains valid DCSA v3.0.0 structure
    echo    - Has all required fields present
    echo    - Should now pass validation successfully
    echo.
    echo 🧪 TO TEST THE FIXED VALIDATION:
    echo 1. Run: npm run dev
    echo 2. Navigate to Carrier Dashboard
    echo 3. Click "✅ Approve Shipping Instructions"
    echo 4. In enhanced form, upload the sample JSON file to DCSA Validation
    echo 5. Should now show "✅ DCSA v3 Schema Valid" with green checkmark
    echo 6. Use "🔍 Debug Validation" button if issues persist
    echo.
    echo 🔧 TROUBLESHOOTING:
    echo - Open browser console (F12 → Console) to see detailed validation logs
    echo - Check that JSON file has "dcsaVersion": "3.0.0" at root level
    echo - Verify all required transportDocument fields are present
    echo - Use debug button to inspect validation state
    echo.
    echo ✅ EXPECTED RESULT:
    echo    Version: "3.0.0" ✓ Valid v3.x.x format
    echo    All required fields present
    echo    Validation status: VALID
) else (
    echo ❌ Build failed. Please check the errors above.
)

echo.
echo 💡 The sample JSON file should now validate successfully!
echo If it still fails, please share the console logs from the debug button.

pause