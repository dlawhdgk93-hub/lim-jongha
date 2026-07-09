# 볼륨비서 (VoiceSecretary)

말 한마디로 끝내는 3초 일정 관리 비서 — React Native (Expo) + Supabase MVP

## 주요 기능

- **즉시 음성/텍스트 일정 등록** — 마이크 버튼 또는 텍스트 입력
- **AI 일정 파싱** — OpenAI Whisper + GPT-4o-mini (선택), 또는 무료 한국어 파서
- **오늘 일정 대시보드** — Realtime 동기화
- **일정 상세·수정·완료·스누즈** — 5/10/30분 미루기
- **로컬 푸시 알림** — Expo Notifications
- **이메일 회원가입/로그인** — Supabase Auth

## 사전 요구사항

- Node.js 20 이상
- npm 또는 yarn
- Expo Go 앱 (iOS/Android) 또는 시뮬레이터

## 설치 및 실행

```bash
cd voice-secretary
npm install
npx expo start
```

Expo Go에서 QR 코드를 스캔하거나, `a`(Android) / `i`(iOS)로 시뮬레이터 실행.

## 환경 변수

`voice-secretary/.env` 파일:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ybrnljmnuahopuuyexog.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Supabase Edge Function 원격 배포

### 무료 모드 (OpenAI 불필요)

텍스트 파싱 API만 사용할 때:

```bash
npm install -g supabase
supabase login
supabase link --project-ref ybrnljmnuahopuuyexog
supabase functions deploy voice-parse
```

배포 후 엔드포인트:

`https://ybrnljmnuahopuuyexog.supabase.co/functions/v1/voice-parse`

### 음성 STT 모드 (OpenAI 유료)

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy voice-parse
```

### Edge Function 없이 사용

마이크 버튼 **길게 누르기** → 텍스트 입력 → 내장 한국어 파서로 일정 등록 가능.

예: `내일 오후 2시 김과장 미팅`

## DB 스키마

| 테이블 | 설명 |
|--------|------|
| `profiles` | 사용자 프로필, 플랜, 푸시 토큰 |
| `schedules` | 일정 |
| `push_tokens` | Expo Push 토큰 |
| `subscriptions` | Stripe 구독 (P1) |
| `voice_parse_usage` | 일일 음성 파싱 사용량 (Starter 20회/일) |

## 프로젝트 구조

```
voice-secretary/
├── App.tsx                 # 앱 진입점
├── src/
│   ├── components/         # VoiceButton, ScheduleCard, ParsingPreview
│   ├── screens/            # Home, Detail, Settings, Auth, Onboarding
│   ├── services/           # supabase, openai, pushNotification
│   ├── hooks/              # useAudioRecorder, useSchedules, useVoiceParser
│   ├── utils/              # dateFormatter, nlpParser, deepLinks
│   ├── store/              # Zustand 인증 상태
│   └── constants/          # config, 색상, 플랜
└── ../supabase/functions/voice-parse/   # Edge Function 소스
```

## 사용 팁

1. **회원가입** → 온보딩에서 마이크·알림 권한 허용
2. **홈 화면** → 🎤 탭하여 녹음 (3초 무음 시 자동 종료)
3. **텍스트 입력** → 🎤 버튼 길게 누르기
4. **일정 수정** → 카드 탭 → 상세 화면

## PRD 문서

- [제품 개요](../docs/PRD-Overview.md)
- [모바일 PRD](../docs/PRD-Mobile.md)
- [웹 PRD](../docs/PRD-Web.md)
