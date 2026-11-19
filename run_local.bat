@echo off
title Pinned Week System (PWS) - Local Server
cd /d "%~dp0"

echo ===================================================
echo   Pinned Week System (PWS) - Starting Local App
echo ===================================================
echo.

if not exist "node_modules" (
    echo [1/2] Installing dependencies for the first time...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies. Press any key to exit.
        pause >nul
        exit /b 1
    )
)

echo [2/2] Starting Next.js dev server on http://localhost:3000
echo Keep this window open while using the app. Press Ctrl+C to stop.
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
call npm run dev
pause
