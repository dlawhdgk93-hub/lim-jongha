@echo off
REM Node.js PATH + 기존 Metro 종료 + Tunnel 시작
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo ========================================
echo  팀데이 - Tunnel 모드 (QR 무한로딩 해결)
echo ========================================
echo.

REM 8081 포트 사용 중인 이전 서버 종료
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
  echo 이전 Metro 프로세스 종료: %%a
  taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

if not exist "node_modules\" (
  echo 의존성 설치 중...
  call npm install
)

echo.
echo Tunnel 시작... (Expo 로그인 요청 시 브라우저에서 로그인)
echo QR 코드가 나오면 Expo Go로 스캔하세요.
echo.

call npx expo start --tunnel --clear