@echo off
chcp 65001 >nul
REM 팀데이 Android APK 빌드 (Expo EAS 클라우드)
set "PATH=C:\Program Files\nodejs;%PATH%"
set "EAS_NO_VCS=1"
cd /d "%~dp0"

echo ========================================
echo  팀데이 APK 빌드
echo  (Expo 클라우드에서 빌드 후 다운로드)
echo ========================================
echo.

if not exist "node_modules\" (
  echo npm 패키지 설치 중...
  call npm install
  if errorlevel 1 goto :fail
)

echo [1/3] Expo 로그인 확인...
call npx eas-cli whoami >nul 2>&1
if errorlevel 1 (
  echo.
  echo Expo 계정이 필요합니다. 무료 가입: https://expo.dev/signup
  echo 브라우저/터미널 안내에 따라 로그인해 주세요.
  echo.
  call npx eas-cli login
  if errorlevel 1 goto :fail
)

echo.
echo [2/3] EAS 프로젝트 연결 (최초 1회)...
call npx eas-cli init
if errorlevel 1 goto :fail

echo.
echo [3/3] APK 빌드 시작 (약 10~20분, 클라우드에서 진행)...
echo 빌드가 끝나면 터미널에 APK 다운로드 링크가 표시됩니다.
echo.
call npx eas-cli build --platform android --profile preview
if errorlevel 1 goto :fail

echo.
echo ========================================
echo  빌드 요청 완료!
echo  expo.dev 대시보드에서도 APK를 받을 수 있습니다.
echo  휴대폰: APK 파일을 옮긴 뒤 설치
echo  (설정 - 보안 - 알 수 없는 앱 설치 허용)
echo ========================================
pause
exit /b 0

:fail
echo.
echo 빌드 중 오류가 발생했습니다.
pause
exit /b 1
