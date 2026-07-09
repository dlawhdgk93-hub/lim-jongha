@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

if not exist "node_modules\" call npm install

echo [TIP] QR 무한로딩이면 start-tunnel.bat 사용
echo.

call npx expo start --clear --lan
