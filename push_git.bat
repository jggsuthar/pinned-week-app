@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo   Pushing Pinned Week App to GitHub
echo   Target: https://github.com/jggsuthar/pinned-week-app.git
echo ==================================================
echo.

if not exist ".git" (
    echo Initializing Git repository...
    git init
    git branch -M main
) else (
    git branch -M main 2>nul
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin https://github.com/jggsuthar/pinned-week-app.git
) else (
    git remote set-url origin https://github.com/jggsu/pinned-week-app.git 2>nul
    git remote set-url origin https://github.com/jggsuthar/pinned-week-app.git
)

echo Staging files...
git add -A

set "COMMIT_MSG="
set /p "COMMIT_MSG=Enter commit message (press Enter for default): "
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update Pinned Week App"

git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo.
    echo Note: Nothing new to commit or commit skipped. Proceeding to push...
)

echo.
echo Pushing to origin main (replacing older remote version)...
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo [ERROR] Push failed. Please check your Git authentication / network.
) else (
    echo.
    echo [SUCCESS] App pushed cleanly to https://github.com/jggsuthar/pinned-week-app
)

echo.
pause
