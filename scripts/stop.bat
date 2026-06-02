@echo off
title TSMusicBot Stop
echo Stopping TSMusicBot...
echo.

taskkill /IM node.exe /F >nul 2>&1
if %errorlevel% equ 0 (
  echo All node.exe processes were stopped.
) else (
  echo No running node.exe process found.
)

echo.
echo Done.
pause
