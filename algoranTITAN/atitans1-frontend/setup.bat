@echo off
echo ========================================
echo   AlgoTITANS V2 - Quick Setup Script
echo ========================================
echo.

echo [1/4] Checking Node.js version...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 20.0 or higher.
    pause
    exit /b 1
)

echo [2/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo [3/4] Generating Algorand app clients...
call npm run generate:app-clients
if errorlevel 1 (
    echo WARNING: App clients generation failed. This is normal for first-time setup.
)

echo [4/4] Setting up environment...
if not exist .env (
    copy .env.template .env
    echo Created .env file from template.
    echo PLEASE EDIT .env file to configure your network settings.
)

echo.
echo ========================================
echo          Setup Complete! 
echo ========================================
echo.
echo To start the development server:
echo   npm run dev
echo.
echo To access the application:
echo   Open http://localhost:5173 in your browser
echo.
echo Next steps:
echo 1. Edit .env file for your network
echo 2. Install Pera Wallet and fund with TestNet ALGO
echo 3. Run: npm run dev
echo 4. Connect wallet and explore the platform
echo.
pause
