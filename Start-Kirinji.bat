@echo off
setlocal
cd /d "%~dp0"
title Kirinji Uniform Size Pro V2
where node >nul 2>nul
if errorlevel 1 (
  echo [Kirinji] Node.js is not installed.
  echo Install Node.js 24 LTS from https://nodejs.org/
  echo Then double-click Start-Kirinji.bat again.
  pause
  exit /b 1
)
node "%~dp0scripts\start-app.mjs"
if errorlevel 1 (
  echo.
  echo [Kirinji] Startup failed. See the error message above.
  pause
  exit /b 1
)
endlocal
