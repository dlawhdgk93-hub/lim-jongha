# 팀데이 APK 설치 가이드

## 설치가 안 될 때 (가장 흔한 원인)

### 1. 기존 앱을 먼저 삭제하지 않음 (필수)
이전에 EAS로 받은 **팀데이**가 남아 있으면 GitHub 빌드 APK는 **설치되지 않습니다.**  
(서명이 달라서 덮어쓰기 불가)

1. 설정 → 앱 → **팀데이** → **삭제**
2. 홈 화면 아이콘도 사라졌는지 확인
3. 그다음 새 APK 설치

### 2. ZIP 파일을 설치하려 함
GitHub Actions **Artifacts**는 ZIP입니다. ZIP 안의 `.apk`만 설치하세요.

### 3. 카카오톡으로 보냄
카카오톡은 APK를 **압축/변형**해서 설치 실패가 잦습니다.  
**Chrome 직접 다운로드**, USB, Google Drive를 사용하세요.

---

## 폰에서 바로 받기 (권장)

1. 폰 **Chrome**으로 접속  
   https://github.com/dlawhdgk93-hub/lim-jongha/releases/latest

2. **teamday-v1.0.16.apk** 탭 → 다운로드

3. **기존 팀데이 완전 삭제** 후 설치

4. **알 수 없는 출처** 허용 (Chrome 또는 내 파일 앱)

## 직접 링크

https://github.com/dlawhdgk93-hub/lim-jongha/releases/latest/download/teamday-v1.0.16.apk

---

## PC에서 폰으로 옮길 때

1. APK 파일인지 확인 (확장자 `.apk`, ZIP 아님)
2. USB 케이블 또는 Google Drive 사용
3. 폰 **내 파일** 앱에서 APK 탭 → 설치
