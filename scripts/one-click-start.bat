@echo off
title HAJIMI One-Click Start
setlocal

echo HAJIMI one-click start
echo.

cd /d "%~dp0.."
set "ROOT=%CD%"

set "TTS_MODEL=D:\TTS\VoxCPM2"
set "TTS_HOST=127.0.0.1"
set "TTS_PORT=8000"
set "TTS_TIMESTEPS=6"
set "TTS_CFG=1.5"
set "TTS_SEED=20250601"
set "TTS_DEVICE=auto"

if not exist "%TTS_MODEL%" (
  echo [ERROR] TTS model path not found: %TTS_MODEL%
  pause
  exit /b 1
)

set "PY_EXE=%ROOT%\.venv-voxcpm\Scripts\python.exe"
if not exist "%PY_EXE%" (
  where python >nul 2>&1
  if %errorlevel% neq 0 (
    echo [ERROR] Python not found, and .venv-voxcpm is missing.
    pause
    exit /b 1
  )
  set "PY_EXE=python"
)

echo [1/2] Starting VoxCPM TTS service...
set "TTS_IN_USE="
for /f "delims=" %%p in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %TTS_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"') do set "TTS_IN_USE=%%p"
if defined TTS_IN_USE (
  echo TTS port %TTS_PORT% is already in use by PID %TTS_IN_USE%, reusing existing service.
) else (
  start "HAJIMI-TTS" cmd /k "%PY_EXE% scripts\tts\voxcpm_server.py --host %TTS_HOST% --port %TTS_PORT% --model %TTS_MODEL% --timesteps %TTS_TIMESTEPS% --cfg %TTS_CFG% --seed %TTS_SEED% --device %TTS_DEVICE%"
)

timeout /t 2 /nobreak >nul

echo [2/2] Starting HAJIMI bot...
call scripts\start.bat

endlocal
