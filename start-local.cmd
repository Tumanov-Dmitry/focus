@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js and try again.
  pause
  exit /b 1
)

powershell.exe -NoProfile -Command "$client = New-Object Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 3000); exit 0 } catch { exit 1 } finally { $client.Dispose() }"
if not errorlevel 1 (
  echo Focus is already running at http://127.0.0.1:3000
  if not defined FOCUS_NO_BROWSER start "" "http://127.0.0.1:3000"
  exit /b 0
)

if not exist "node_modules\.bin\next.cmd" (
  echo Installing dependencies...
  call npm.cmd ci --legacy-peer-deps
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Focus at http://127.0.0.1:3000
echo Press Ctrl+C to stop the server.

if not defined FOCUS_NO_BROWSER (
  start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "$deadline = (Get-Date).AddSeconds(60); while ((Get-Date) -lt $deadline) { try { $response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000' -TimeoutSec 2; if ($response.StatusCode -ge 200) { Start-Process 'http://127.0.0.1:3000'; break } } catch {}; Start-Sleep -Milliseconds 500 }"
)
call npm.cmd run dev -- --hostname 127.0.0.1 --port 3000

set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo The local server stopped with an error.
  pause
)

exit /b %EXIT_CODE%
