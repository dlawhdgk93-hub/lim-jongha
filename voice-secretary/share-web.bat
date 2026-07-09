@echo off
REM 빌드 후 같은 Wi-Fi 사람들이 브라우저로 접속 가능
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if not exist "dist\index.html" (
  echo dist 폴더 없음. 먼저 빌드합니다...
  call npm run build:web
)

echo.
echo ========================================
echo  팀데이 웹 - LAN 공유 모드
echo  아래 주소를 주변 사람에게 공유하세요
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  echo   http://%%a:4173
)

echo.
echo 서버 시작 중... (종료: Ctrl+C)
echo.

call npx serve dist -l 4173
