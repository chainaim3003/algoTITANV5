@echo off
echo Starting Chrome with CORS disabled for LocalNet development...
echo Close all Chrome windows first!
pause

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --disable-features=VizDisplayCompositor --user-data-dir="C:\temp\chrome-dev" http://localhost:5173

echo Browser started with CORS disabled for LocalNet development
echo You can now test blockchain transactions!
pause
