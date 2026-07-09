@echo off
REM PC 브라우저용 웹 빌드 (dist 폴더 생성)
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if not exist "node_modules\" call npm install

echo 웹 빌드 중...
call npm run build:web

echo.
echo ========================================
echo  빌드 완료: dist 폴더
echo  로컬 미리보기: npx serve dist
echo  온라인 공유: Vercel 배포 (아래 README 참고)
echo ========================================
pause
