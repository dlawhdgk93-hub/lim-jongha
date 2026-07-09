# 볼륨비서 (VoiceSecretary) — 제품 개요

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-07-04 |
| 제품명 | 볼륨비서 (VoiceSecretary) |
| 한 줄 소개 | 말 한마디로 끝내는 3초 일정 관리 비서 |

---

## 1. 제품 비전

손이 바쁜 순간에도 **음성 한마디**로 일정을 등록하고, **맥락 기반 알림**으로 바로 실행까지 이어지는 일정 관리 경험을 제공한다.

---

## 2. 핵심 가치

| 가치 | 설명 |
|------|------|
| **입력 마찰 제거** | 타이핑·터치 최소화, 음성 중심 UX |
| **3초 등록** | 짧은 발화 → AI 파싱 → 자동 저장 |
| **맥락 기반 알림** | 전화, 지도, 완료 등 후속 액션을 알림에서 바로 실행 |
| **크로스 플랫폼** | 모바일(현장) + 웹(사무실) 동일 데이터 동기화 |

---

## 3. 플랫폼 구성

| 플랫폼 | 역할 | 기술 스택 | 문서 |
|--------|------|-----------|------|
| **모바일 앱** | 이동 중·현장 음성 입력 | React Native (Expo), Supabase | [PRD-Mobile.md](./PRD-Mobile.md) |
| **웹 앱** | 데스크톱 일정 관리·결제 | Next.js, Supabase, PWA | [PRD-Web.md](./PRD-Web.md) |
| **백엔드** | 인증, DB, AI API | Supabase (Auth, DB, Edge Functions) | 본 문서 §4 |

---

## 4. 기술 아키텍처

```
┌─────────────────┐     ┌─────────────────┐
│  모바일 앱       │     │  웹 앱           │
│  (Expo)         │     │  (Next.js)      │
└────────┬────────┘     └────────┬────────┘
         │                         │
         └──────────┬──────────────┘
                    ▼
         ┌──────────────────────┐
         │  Supabase            │
         │  · Auth              │
         │  · PostgreSQL + RLS  │
         │  · Realtime          │
         │  · Edge Functions    │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │  OpenAI (선택)        │
         │  · Whisper (STT)     │
         │  · GPT-4o-mini (NLP) │
         └──────────────────────┘
```

### 무료 운영 모드 (MVP)

| 구성 요소 | 무료 여부 | 비고 |
|-----------|-----------|------|
| Supabase (Free Tier) | ✅ | DB, Auth, Edge Functions 포함 |
| Expo Go / 로컬 개발 | ✅ | 앱 테스트 무료 |
| 한국어 텍스트 파서 | ✅ | OpenAI 없이 동작 |
| OpenAI Whisper/GPT | ❌ (유료) | 음성 STT·고급 파싱 시 필요 |
| Stripe 결제 | 수수료 발생 | P1 기능 |

> **무료로 시작:** 텍스트 입력 또는 내장 한국어 파서로 일정 등록 가능. 음성 STT는 OpenAI API 키 설정 시 활성화.

---

## 5. 핵심 기능 (MVP)

| 기능 | 모바일 | 웹 | 우선순위 |
|------|--------|-----|----------|
| 즉시 음성/텍스트 일정 등록 | ✅ | ✅ | P0 |
| AI 일정 파싱 | ✅ | ✅ | P0 |
| 오늘 일정 대시보드 | ✅ | ✅ | P0 |
| 일정 상세·수정 | ✅ | ✅ | P0 |
| 푸시/브라우저 알림 | ✅ | ✅ | P0 |
| 맥락 액션 (전화/지도) | P0/P1 | P1 | P0~P1 |
| 스마트 스누즈 | P1 | P1 | P1 |
| Stripe 결제 | P1 | P1 | P1 |

---

## 6. 데이터 모델 (요약)

| 테이블 | 용도 |
|--------|------|
| `profiles` | 사용자 프로필, 플랜, 알림 설정 |
| `schedules` | 일정 (음성 원문, 파싱 결과, 알람 시각) |
| `push_tokens` | Expo Push 토큰 (모바일) |
| `push_subscriptions` | Web Push 구독 (웹) |
| `subscriptions` | Stripe 구독 정보 |
| `voice_parse_usage` | 일일 음성 파싱 사용량 (Starter 20회/일) |

---

## 7. 현재 구현 상태

| 항목 | 상태 |
|------|------|
| Supabase DB + RLS | ✅ 완료 |
| Expo 모바일 앱 (MVP) | ✅ 코드 작성 완료 |
| Edge Function `voice-parse` | 📁 로컬 소스 준비, 원격 배포 필요 |
| 웹 앱 (Next.js) | ⏳ PRD만 작성, 미구현 |

---

## 8. 실행 방법

### 모바일 앱

```bash
cd voice-secretary
npm install
npx expo start
```

### Edge Function 원격 배포 (무료 Supabase)

```bash
# Supabase CLI 설치 후
supabase login
supabase link --project-ref ybrnljmnuahopuuyexog
supabase functions deploy voice-parse
```

OpenAI 없이 무료 사용 시 배포만 하면 텍스트 파싱 API가 동작합니다.

OpenAI 음성 STT를 쓰려면 (유료):

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## 9. 관련 문서

- [모바일 PRD](./PRD-Mobile.md)
- [웹 PRD](./PRD-Web.md)
- [앱 README](../voice-secretary/README.md)
- [루트 PRD](../PRD.md)
