@echo off
echo ====================================
echo Pre-Deployment Check
echo ====================================
echo.
echo Checking prerequisites for deployment...
echo.
npx tsx scripts/pre-deployment-check.ts
echo.
pause
