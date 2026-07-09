# 볼륨비서 앱 실행 스크립트 (Node.js PATH 자동 설정)
$env:Path = "C:\Program Files\nodejs;" + $env:Path
Set-Location $PSScriptRoot

Write-Host "Node: $(node -v)" -ForegroundColor Green

if (-not (Test-Path "node_modules")) {
    Write-Host "의존성 설치 중..." -ForegroundColor Yellow
    npm install
}

Write-Host "Expo 시작..." -ForegroundColor Green
npx expo start
