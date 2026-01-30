@echo off
echo ==========================================
echo   Starting Funding Arbitrage Frontend
echo ==========================================
echo.
echo 1. Setting up environment...
REM Pushd automatically maps a temporary drive letter for UNC paths
pushd "%~dp0"

echo 2. Current Directory: %CD%
echo.
echo 3. Launching Vite...
echo.
call npm run dev

echo.
echo ==========================================
echo   Server stopped unexpectedly?
echo ==========================================
pause
