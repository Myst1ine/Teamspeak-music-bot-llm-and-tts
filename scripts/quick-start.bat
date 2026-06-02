@echo off
title TSMusicBot Quick Start
echo TSMusicBot Quick Start
echo.

cd /d "%~dp0.."

where node >nul 2>&1
if %errorlevel% neq 0 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
  ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
  ) else (
    echo Node.js is not installed or not in PATH.
    echo Please install/use Node 22 LTS, then run scripts\setup.bat.
    pause
    exit /b 1
  )
)

for /f "delims=" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
for /f "tokens=1 delims=v." %%a in ("%NODE_VER%") do set "NODE_MAJOR=%%a"
if not "%NODE_MAJOR%"=="22" (
  echo Detected Node.js %NODE_VER%.
  echo This project currently works best with Node.js 22.x for native opus module compatibility.
  echo Please install Node.js 22 LTS, then run scripts\setup.bat again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencies not found, running setup...
  call scripts\setup.bat
  if %errorlevel% neq 0 exit /b %errorlevel%
)

if not exist "dist" (
  echo Build output not found, running setup...
  call scripts\setup.bat
  if %errorlevel% neq 0 exit /b %errorlevel%
)

echo Starting bot...
call scripts\start.bat
