# 볼륨비서 (VoiceSecretary) PRD

> 말 한마디로 끝내는 3초 일정 관리 비서

## 문서 목록

| 문서 | 설명 |
|------|------|
| [체험 및 공유 가이드](./docs/GUIDE-Trial-and-Share.md) | Expo Go 체험 |
| [PC 브라우저 공유 가이드](./docs/SHARE-WEB.md) | **QR 없이 URL/ZIP으로 공유** |
| [제품 개요](./docs/PRD-Overview.md) | 비전, 아키텍처, 무료 운영 가이드 |
| [모바일 PRD](./docs/PRD-Mobile.md) | iOS/Android Expo 앱 상세 명세 |
| [웹 PRD](./docs/PRD-Web.md) | Next.js 웹/PWA 상세 명세 |

## 빠른 시작

```bash
cd voice-secretary
npm install
npx expo start
```

## Supabase (무료 플랜)

| 항목 | 값 |
|------|-----|
| Project URL | `https://ybrnljmnuahopuuyexog.supabase.co` |
| Edge Function | `voice-parse` (원격 배포 필요) |
| DB | profiles, schedules, push_tokens 등 (마이그레이션 완료) |

## 원격 배포 (무료)

Supabase CLI로 Edge Function 배포:

```bash
supabase login
supabase link --project-ref ybrnljmnuahopuuyexog
supabase functions deploy voice-parse
```

- **무료:** 텍스트 파싱 + 한국어 규칙 기반 파서
- **유료 (선택):** `supabase secrets set OPENAI_API_KEY=sk-...` → 음성 STT 활성화

자세한 내용은 [제품 개요](./docs/PRD-Overview.md) §8 참고.
