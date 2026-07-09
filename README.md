# lim-jongha / 팀데이 (TeamDay)

음성·텍스트로 일정을 등록하는 모바일 비서 앱 프로젝트입니다.

## 구조

- `voice-secretary/` — React Native (Expo) 앱
- `supabase/` — Edge Functions (voice-parse 등)
- `docs/` — PRD 문서

## APK 빌드 (GitHub Actions)

1. GitHub **Actions** 탭 → **Build Android APK** 워크플로 실행
2. 완료 후 **Artifacts**에서 `teamday-apk` 다운로드
3. 폰에 설치 (알 수 없는 출처 허용)

`main` 브랜치에 `voice-secretary/` 변경이 push되면 자동 빌드됩니다.

## 로컬 개발

```bash
cd voice-secretary
npm install
npx expo start
```
