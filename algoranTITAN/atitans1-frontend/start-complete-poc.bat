@echo off
echo ========================================
echo   COMPLETE POC IMPLEMENTATION READY!
echo ========================================
echo.

echo [1/2] Stopping any running development server...
taskkill /f /im node.exe 2>nul

echo [2/2] Starting development server with all new features...
timeout /t 2 /nobreak >nul
echo.
echo \u2705 IMPLEMENTED FEATURES:
echo    \ud83c\udfe0 Home tab with complete landing page
echo    \ud83c\udfec Marketplace tab with dual flows
echo    \ud83d\udcb0 Direct sale flow (1%% marketplace fee)
echo    \ud83d\ude80 Enhanced financing/tokenization flow
echo    \ud83d\udd04 Automatic role switching for each tab
echo    \u2699\ufe0f Marketplace roles (MARKETPLACE_OPERATOR, MARKETPLACE_ADMIN)
echo    \ud83d\udcca Real-time marketplace statistics
echo    \ud83d\udd17 Seamless address management across all roles
echo.
echo Starting server...
call npm run dev

pause
