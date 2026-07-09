@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo ========================================
echo  팀데이 - OpenAI API 키 Supabase 등록
echo ========================================
echo.

echo [1/2] Supabase CLI 로그인
echo   - 아래에 "Press Enter to open browser" 가 보이면 Enter 키를 누르세요.
echo   - 브라우저에서 Supabase 로그인/승인 후 이 창으로 돌아오세요.
echo.
call npx --yes supabase login
if %ERRORLEVEL% NEQ 0 goto :fail

echo.
echo [2/2] OPENAI_API_KEY 등록 중...
call npx --yes supabase secrets set --env-file "supabase\.env.secrets" --project-ref ybrnljmnuahopuuyexog
if %ERRORLEVEL% NEQ 0 goto :fail

echo.
echo ========================================
echo  완료! 앱에서 마이크를 다시 테스트해 주세요.
echo ========================================
pause
exit /b 0

:fail
echo.
echo ========================================
echo  실패 - 대시보드에서 직접 등록해 주세요
echo ========================================
echo https://supabase.com/dashboard/project/ybrnljmnuahopuuyexog/settings/functions
echo.
echo 시크릿 이름: OPENAI_API_KEY
pause
exit /b 1
