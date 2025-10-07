@echo off
REM Phase 3 Setup Script for Windows
REM Installs dependencies and verifies the installation

setlocal enabledelayedexpansion

echo =========================================
echo Phase 3 - Notification System Setup
echo =========================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "SERVER_DIR=%PROJECT_ROOT%\planka\server"

REM Check if we're in the right directory
if not exist "%SERVER_DIR%\package.json" (
    echo ❌ Error: Cannot find server\package.json
    echo Please run this script from the project root
    exit /b 1
)

echo 📦 Installing server dependencies...
cd /d "%SERVER_DIR%"
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo.
echo ✅ Dependencies installed
echo.

REM Check if node-cron was installed
call npm list node-cron >nul 2>&1
if errorlevel 1 (
    echo ❌ node-cron not found
    exit /b 1
) else (
    echo ✅ node-cron installed
)

REM Check if sinon was installed (dev dependency)
call npm list sinon >nul 2>&1
if errorlevel 1 (
    echo ⚠️  sinon not found (dev dependency)
) else (
    echo ✅ sinon installed (dev)
)

echo.
echo 🧪 Running tests...
call npm test -- test/notifications/
if errorlevel 1 (
    echo ⚠️  Some tests failed, but installation is complete
)

echo.
echo =========================================
echo ✅ Phase 3 Setup Complete!
echo =========================================
echo.
echo Next steps:
echo.
echo 1. Start the due date worker:
echo    node server\workers\due-date-worker.js
echo.
echo    Or with PM2:
echo    pm2 start server\workers\due-date-worker.js --name planka-due-date-worker
echo.
echo 2. Restart Planka:
echo    docker-compose restart
echo    # or
echo    pm2 restart planka
echo.
echo 3. Access UI:
echo    Login → Settings → Notifications tab
echo.
echo For more information, see docs\PHASE3_QUICK_START.md
echo.

endlocal
