@echo off
echo   Stopping FZF Launcher...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3579 " ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>&1
  echo   Stopped (PID %%a).
  exit /b 0
)
echo   FZF Launcher was not running on port 3579.
