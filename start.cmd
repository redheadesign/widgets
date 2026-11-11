@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22.18 or later, then run start.cmd again.
  pause
  exit /b 1
)
if not exist node_modules\vite\package.json (
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run dev -- --host 127.0.0.1 --open
if errorlevel 1 pause
