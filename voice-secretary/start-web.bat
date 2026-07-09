@echo off
REM PC 브라우저에서 바로 체험 (QR/폰 연결 불필요)
set "PATH=C:\Program Files\nodejs;%PATH%"
set "EXPO_NO_TELEMETRY=1"
cd /d "%~dp0"

echo.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8081' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo ========================================
  echo  서버가 이미 실행 중입니다!
  echo  접속 주소: http://localhost:8081
  echo ========================================
  echo.
  start "" "http://localhost:8081"
  pause
  exit /b 0
)

echo [1/3] 기존 Metro 서버(8081) 정리 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

if not exist "node_modules\" (
  echo [2/3] npm install...
  call npm install
) else (
  echo [2/3] 의존성 OK
)

echo [3/3] 웹 개발 서버 시작...
echo.
echo ========================================
echo  접속 주소: http://localhost:8081
echo  (브라우저가 자동으로 안 열리면 위 주소 입력)
echo  종료: 이 창에서 Ctrl+C
echo  ※ 새로고침만 하세요. bat 파일을 다시 누르면
echo     서버가 잠깐 끊길 수 있습니다.
echo ========================================
echo.

call npx expo start --web --port 8081

if errorlevel 1 (
  echo.
  echo 8081 포트 시작 실패. 8082로 재시도...
  call npx expo start --web --port 8082
  echo.
  echo ========================================
  echo  접속 주소: http://localhost:8082
  echo ========================================
  start "" "http://localhost:8082"
)

pause
