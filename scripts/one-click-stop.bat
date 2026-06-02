@echo off
title HAJIMI One-Click Stop
setlocal

echo HAJIMI one-click stop
echo.

cd /d "%~dp0.."
set "ROOT=%CD%"

echo [1/2] Stopping bot process (node dist/index.js)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = '%ROOT:\=\\%';" ^
  "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*dist/index.js*' -and $_.CommandLine -like ('*' + $root + '*') };" ^
  "if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Write-Output ('Stopped node: ' + $procs.Count) } else { Write-Output 'No matching node process found' }"

echo [2/2] Stopping VoxCPM TTS process (voxcpm_server.py)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*.exe' -and $_.CommandLine -like '*scripts/tts/voxcpm_server.py*' };" ^
  "if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Write-Output ('Stopped python: ' + $procs.Count) } else { Write-Output 'No matching python process found' }"

echo.
echo Done.
pause

endlocal
