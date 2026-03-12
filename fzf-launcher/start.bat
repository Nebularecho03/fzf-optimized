@echo off
cd /d "%~dp0"

REM Check if already running
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3579 " ^| findstr "LISTENING"') do (
  echo   FZF Launcher is already running on port 3579.
  echo   Open http://localhost:3579 in your browser.
  echo   To stop it: stop.bat
  start "" http://localhost:3579
  exit /b 0
)

echo.
echo   Starting FZF Launcher in background...
echo.
start /B "FZF Launcher" node src\server.js

timeout /t 2 /nobreak >nul
start "" http://localhost:3579
echo   FZF Launcher is running at http://localhost:3579
echo   You can close this window — the server will keep running.
echo   To stop the server, run: stop.bat
echo.
