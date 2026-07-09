@echo off
chcp 65001 >nul
REM Expo CLI 로그인 (브라우저에서 승인 1회)
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo ========================================
echo  Expo CLI 로그인
echo  (expo.dev 웹 로그인과 별도로 1회 필요)
echo ========================================
echo.
echo 브라우저가 열리면 Expo 계정으로 [Allow] 눌러 주세요.
echo.

call npx eas-cli login

echo.
call npx eas-cli whoami
echo.
echo 로그인 완료 후 build-apk.bat 을 실행하거나
echo Cursor 채팅에 "로그인 했어" 라고 알려 주세요.
pause
