# 볼륨비서 (VoiceSecretary) — 웹 애플리케이션 PRD

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-07-04 |
| 플랫폼 | 웹 (데스크톱 / 모바일 브라우저, PWA) |
| 대상 릴리스 | MVP (v0.1) |

---

## 1. 제품 개요

### 1.1 제품 정의

| 항목 | 내용 |
|------|------|
| **제품명** | 볼륨비서 (VoiceSecretary) — 웹 |
| **한 줄 소개** | 브라우저에서 말 한마디로 끝내는 3초 일정 관리 |
| **플랫폼 포지셔닝** | **데스크톱·태블릿 업무 환경** 및 모바일 웹 보조 채널. 모바일 앱과 동일 계정·데이터 동기화 |

### 1.2 핵심 가치 제안

키보드 입력 없이 **웹 음성 API / 마이크**로 일정을 등록하고, **브라우저 알림·PWA**로 데스크톱 업무 중에도 맥락 기반 리마인더를 제공한다. 모바일 앱이 "이동 중·현장"을 담당한다면, 웹은 **사무실·홈·멀티 모니터** 환경에서의 일정 관리 허브 역할을 한다.

### 1.3 웹 플랫폼 선정 이유

| 기술 | 선정 이유 |
|------|-----------|
| **Next.js (React)** | SSR/SSG, API Routes, PWA 지원, SEO(랜딩·온보딩) |
| **Supabase** | 모바일과 동일 인증·DB, Realtime 구독으로 크로스 플랫폼 동기화 |
| **OpenAI Whisper + GPT-4o-mini** | 모바일과 동일 파싱 파이프라인 (Edge Function 공유) |
| **Web Push (VAPID)** | 데스크톱 Chrome/Edge/Firefox 브라우저 알림 |
| **PWA** | 홈 화면 설치, 오프라인 캐시, 앱과 유사한 UX |

### 1.4 모바일 앱과의 관계

| 구분 | 모바일 앱 | 웹 |
|------|-----------|-----|
| **주요 사용 사례** | 이동 중·현장 음성 입력 | 데스크톱 일정 확인·수정·대량 관리 |
| **음성 입력** | 네이티브 마이크, 위젯 | 브라우저 마이크 (탭 활성 필요) |
| **푸시 알림** | Expo Push (풍부한 액션) | Web Push (제한적 액션) |
| **오프라인** | 녹음 큐 (P2) | PWA 캐시 + 읽기 전용 |
| **결제·설정** | 앱 내 | 웹 우선 (Stripe Checkout) |

### 1.5 성공 지표 (KPI) — MVP

| 지표 | 목표 |
|------|------|
| 웹 → 앱 크로스 설치 전환율 | ≥ 25% |
| 데스크톱 DAU / MAU | ≥ 30% |
| 음성 파싱 성공률 (웹) | ≥ 80% |
| Web Push 수신 동의율 | ≥ 35% |

---

## 2. 사용자 정의

### 2.1 페르소나 (웹 특화)

| 페르소나 | 특성 | 웹 사용 시나리오 |
|----------|------|------------------|
| **사무실 직장인 (최대리, 35)** | PC 앞 8시간 | 회의 중 빠른 음성 일정 등록, 캘린더 뷰로 주간 확인 |
| **프리랜서 (정디자이너, 29)** | 노트북·태블릿 병행 | 클라이언트 미팅 후 브라우저에서 일정 수정·메모 보완 |
| **모바일 앱 사용자 (공통)** | 앱 주 사용 | 웹에서 상세 수정·설정·결제 관리 |

### 2.2 유저 스토리

| ID | 사용자로서 | 원하는 것 | 목적 | 우선순위 |
|----|-----------|-----------|------|----------|
| US-W01 | 사무실 직장인 | PC에서 스페이스바 길게 눌러 음성 일정 등록 | 마우스·키보드 전환 없이 빠르게 기록 | P0 |
| US-W02 | 앱 사용자 | 웹에서 등록한 일정이 앱과 실시간 동기화 | 플랫폼 간 데이터 불일치 없음 | P0 |
| US-W03 | Pro 사용자 | 웹에서 구독·결제·영수증 관리 | App Store 수수료 없이 업그레이드 | P1 |
| US-W04 | 데스크톱 사용자 | 브라우저 알림으로 일정 리마인더 수신 | 앱 없이도 알림 받기 | P0 |
| US-W05 | 관리자(팀) | 웹 대시보드에서 팀 일정 조회 | Team 플랜 협업 (P2) | P2 |

---

## 3. 핵심 기능 명세

### 3.1 즉시 음성 분석기 (웹 음성 분석) — P0

#### 설명
대시보드 진입 시 또는 단축키(스페이스바 길게 누름)로 브라우저 마이크를 활성화하고, 모바일과 동일 AI 파이프라인으로 일정을 파싱·저장한다.

#### 사용자 흐름

```
/dashboard 접속
    → (최초) 마이크·알림 권한 요청
    → 🎤 버튼 클릭 또는 스페이스바 0.5초 길게 누름
    → 브라우저 MediaRecorder 녹음 (3초 무음 VAD)
    → "분석 중..." 스켈레톤 UI
    → 파싱 결과 사이드 패널 미리보기
    → [Enter] 자동 저장 / [Esc] 취소
    → 일정 리스트 Realtime 갱신
```

#### 모바일 대비 차이점

| 항목 | 모바일 | 웹 |
|------|--------|-----|
| 녹음 API | expo-av | MediaRecorder API |
| 백그라운드 녹음 | 제한적 지원 | **불가** (탭 활성 필수) |
| 자동 마이크 시작 | 앱 실행 시 | 사용자 제스처 필요 (클릭/키) |
| VAD (무음 감지) | 네이티브 | Web Audio AnalyserNode |

#### 비즈니스 규칙

| 규칙 ID | 내용 |
|---------|------|
| BR-WV01 | HTTPS 필수 (마이크 API 요구사항) |
| BR-WV02 | 3초 무음 시 녹음 종료 (모바일 BR-V01 동일) |
| BR-WV03 | Safari: getUserMedia 제한 → Chrome/Edge 권장 배너 표시 |
| BR-WV04 | Starter: 일 20회 (모바일과 계정 공유 카운트) |

#### UI 요구사항

- **플로팅 음성 버튼** (우하단 FAB, 데스크톱)
- **키보드 단축키:** `Space` (길게 누름) = 녹음, `Esc` = 취소, `Enter` = 저장
- 녹음 중 **글로벌 상태 표시** (상단 바 + 파형)
- 파싱 결과 **인라인 편집** (날짜 선택기, 시간 입력)

---

### 3.2 맥락 기반 Web Push (브라우저 알림) — P0

#### 설명
일정 시각에 Web Push 알림을 발송하고, 알림 클릭 시 웹앱 해당 일정 상세로 딥링크한다. 데스크톱 OS 알림 센터에서 **액션 버튼** 제공 (브라우저 지원 범위 내).

#### 사용자 흐름

```
target_timestamp 도달
    → Supabase Edge Function → Web Push (VAPID)
    → OS 알림 센터 표시
    → [일정 보기] 클릭 → /schedule/{id} 오픈
    → [완료] 클릭 → Service Worker → API PATCH
```

#### Web Push 액션 (브라우저별)

| 액션 | Chrome/Edge | Firefox | Safari (macOS) |
|------|-------------|---------|----------------|
| 일정 보기 | ✅ | ✅ | ✅ (16.4+) |
| 완료 처리 | ✅ | ✅ | ⚠️ 제한 |
| tel: / maps: | ❌ (알림 내 불가) | ❌ | ❌ |

> **제약:** 웹 푸시는 OS 네이티브 전화/지도 앱 직접 실행 불가. 클릭 시 웹앱 상세 페이지에서 액션 버튼 제공.

#### 상세 페이지 액션 (웹 보완)

| 버튼 | 동작 |
|------|------|
| 📞 전화 | `tel:` 링크 (모바일 웹) / 클립보드 복사 (데스크톱) |
| 🗺️ 지도 | Google Maps 새 탭 |
| ✅ 완료 | PATCH status |
| ⏰ 5분 미루기 | PATCH snooze |

#### 비즈니스 규칙

| 규칙 ID | 내용 |
|---------|------|
| BR-WN01 | Web Push 구독 정보는 `push_subscriptions` 테이블 저장 |
| BR-WN02 | 구독 만료 시 재동의 배너 표시 |
| BR-WN03 | 모바일 앱 토큰과 **중복 알림 방지** 옵션 (설정, 기본: 앱 우선) |

---

### 3.3 일정 대시보드 (캘린더) — P0

#### 설명
모바일 홈의 리스트 뷰를 확장한 **주간/월간 캘린더**, **타임라인**, **검색·필터** 제공. 웹만의 핵심 차별 기능.

#### 기능

| 기능 | 설명 |
|------|------|
| 주간 뷰 | 7일 그리드, 드래그로 시간 변경 |
| 월간 뷰 | 월별 일정 밀도 히트맵 |
| 리스트 뷰 | 모바일과 동일 카드 UI |
| 검색 | `parsed_content.title`, `raw_text` 전문 검색 |
| 필터 | status, 날짜 범위 |
| 일괄 완료 | 체크박스 다중 선택 |

---

### 3.4 스마트 스누즈 (웹) — P1

#### 설명
알림 또는 상세 페이지에서 음성/텍스트로 스누즈. 웹은 **텍스트 입력 대체 수단** 필수 (알림 팝업에서 마이크 접근 불가).

#### 입력 방식

| 방식 | 우선순위 |
|------|----------|
| 프리셋 버튼 (+5분, +15분, +1시간) | P0 |
| 텍스트 입력 ("30분 뒤") | P1 |
| 상세 페이지 🎤 음성 | P1 |

---

### 3.5 계정 및 결제 허브 — P1

#### 설명
Stripe Checkout 기반 구독 관리. **웹을 결제·플랜 관리 주요 채널**로 설정 (App Store IAP와 분리).

| 기능 | 설명 |
|------|------|
| 플랜 비교 | Starter / Pro / Team |
| 결제 | Stripe 호스팅 결제 |
| 고객 포털 | 구독 변경·취소·영수증 |
| 사용량 | 일일 음성 파싱 횟수 표시 |

---

## 4. 페이지 구조 및 라우팅

### 4.1 페이지 목록

| 페이지 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| **랜딩** | `/` | 제품 소개, 행동 유도 | 공개 |
| **로그인** | `/login` | 이메일, Google OAuth | 공개 |
| **회원가입** | `/signup` | 회원가입 | 공개 |
| **대시보드** | `/dashboard` | 음성 FAB + 오늘/주간 일정 | 필수 |
| **일정 상세** | `/schedule/[id]` | 상세·수정·액션 | 필수 |
| **캘린더** | `/calendar` | 주간/월간 뷰 | 필수 |
| **설정** | `/settings` | 알림, 캘린더, 계정 | 필수 |
| **결제** | `/settings/billing` | Stripe 구독 | 필수 |
| **PWA 설치** | `/install` | PWA 설치 가이드 | 공개 |

### 4.2 대시보드 와이어프레임 (데스크톱)

```
┌──────────────────────────────────────────────────────────┐
│ 🎤 볼륨비서    [오늘|주간|월간]    🔍 검색    ⚙️  👤      │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│  사이드바    │   ┌─────┬─────┬─────┬─────┬─────┐        │
│              │   │ 월  │ 화  │ 수  │ 목  │ 금  │  ...   │
│  + 새 일정   │   ├─────┼─────┼─────┼─────┼─────┤        │
│              │   │     │14:00│     │     │     │        │
│  오늘 (3)    │   │     │미팅 │     │     │     │        │
│  ├ 14:00 미팅│   │     │     │     │     │     │        │
│  ├ 16:30 발주│   └─────┴─────┴─────┴─────┴─────┘        │
│  └ 18:00 통화│                                           │
│              │                              ┌────────┐  │
│  ─────────   │                              │  🎤    │  │
│  이번 주 12  │                              │  FAB   │  │
│              │                              └────────┘  │
└──────────────┴───────────────────────────────────────────┘
```

### 4.3 반응형 기준점

| 기준점 | 레이아웃 |
|--------|----------|
| `< 768px` | 모바일: 단일 컬럼, 하단 FAB, 햄버거 메뉴 |
| `768–1024px` | 태블릿: 접이식 사이드바 |
| `> 1024px` | 데스크톱: 고정 사이드바 + 캘린더 그리드 |

### 4.4 사용자 이동 흐름

```
랜딩 → 회원가입/로그인 → 대시보드
대시보드 → [음성] → 미리보기 패널 → (자동 저장) → 대시보드
대시보드 → 일정 카드 → 상세 → 대시보드
대시보드 → 캘린더 (주간/월간)
설정 → 결제 → Stripe → 설정
Web Push 클릭 → /schedule/[id]
```

---

## 5. 데이터 모델

모바일과 **동일 Supabase 스키마** 공유. 웹 전용 테이블 추가.

### 5.1 공유 테이블 (모바일 PRD 참조)

- `users`, `schedules`, `subscriptions`

### 5.2 웹 전용 테이블

#### push_subscriptions

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| endpoint | text | Web Push 엔드포인트 |
| p256dh | text | 암호화 키 |
| auth | text | 인증 시크릿 |
| user_agent | text | 브라우저 식별 |
| created_at | timestamptz | |

#### calendar_connections (P1)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| provider | enum | `google` \| `apple` \| `outlook` |
| access_token | text (encrypted) | |
| refresh_token | text (encrypted) | |
| sync_enabled | boolean | |
| last_synced_at | timestamptz | |

### 5.3 Realtime 구독

```typescript
// schedules 테이블 변경 시 대시보드 자동 갱신
supabase
  .channel('schedules')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'schedules',
    filter: `user_id=eq.${userId}`
  }, handleScheduleChange)
  .subscribe()
```

---

## 6. API 설계

모바일과 **동일 REST API** + 웹 전용 엔드포인트.

### 6.1 공유 API (모바일 PRD 참조)

- `POST /api/v1/voice/parse`
- `GET/PATCH/DELETE /api/v1/schedules`

### 6.2 웹 전용 API

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/api/v1/push/subscribe` | Web Push 구독 등록 | Bearer |
| DELETE | `/api/v1/push/subscribe` | 구독 해제 | Bearer |
| POST | `/api/v1/billing/checkout` | Stripe Checkout Session 생성 | Bearer |
| POST | `/api/v1/billing/portal` | 고객 포털 URL | Bearer |
| GET | `/api/v1/schedules/search` | 전문 검색 (`?q=`) | Bearer |
| POST | `/api/v1/calendar/sync` | 외부 캘린더 동기화 (P1) | Bearer |

### 6.3 Next.js API Routes 구조

```
app/
├── api/
│   ├── v1/
│   │   ├── voice/parse/route.ts      → Supabase Edge Function 프록시
│   │   ├── schedules/route.ts
│   │   ├── push/subscribe/route.ts
│   │   └── billing/checkout/route.ts
│   └── webhooks/
│       └── stripe/route.ts
```

---

## 7. 인증 및 권한

### 7.1 인증

| 방식 | 우선순위 | 비고 |
|------|----------|------|
| Google OAuth | P0 | Supabase Auth |
| 이메일 + 비밀번호 | P0 | |
| Apple Sign In | P1 | 웹 OAuth 지원 |
| 매직 링크 | P2 | |

> 모바일과 **동일 Supabase Auth** → SSO. 앱에서 가입 후 웹 즉시 로그인 가능.

### 7.2 브라우저 권한

| 권한 | 필수 | 거부 시 UX |
|------|------|------------|
| 마이크 (`getUserMedia`) | ✅ (음성) | 텍스트 수동 입력 대체 |
| 알림 (`Notification`) | ✅ | 인앱 배너 알림만 |
| 클립보드 | ❌ | 전화번호 복사 시 |

### 7.3 PWA 요구사항

| 항목 | 내용 |
|------|------|
| manifest.json | name, icons, theme_color, display: standalone |
| Service Worker | Push 수신, 오프라인 shell 캐시 |
| 설치 안내 | beforeinstallprompt 커스텀 UI |
| 오프라인 | 일정 목록 캐시 (읽기), 음성/쓰기 불가 |

---

## 8. 프로젝트 구조

```
voice-secretary-web/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── schedule/[id]/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── billing/page.tsx
│   ├── page.tsx                  # 랜딩
│   └── layout.tsx
├── components/
│   ├── voice/
│   │   ├── VoiceFAB.tsx
│   │   ├── VoiceRecorder.tsx
│   │   └── ParsingPreview.tsx
│   ├── schedule/
│   │   ├── ScheduleCard.tsx
│   │   ├── WeekCalendar.tsx
│   │   └── MonthCalendar.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── ui/                       # shadcn/ui
├── hooks/
│   ├── useVoiceRecorder.ts       # MediaRecorder + VAD
│   ├── useSchedules.ts
│   ├── useWebPush.ts
│   └── useKeyboardShortcut.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── stripe.ts
│   └── push.ts
├── store/
│   └── scheduleStore.ts          # Zustand
├── public/
│   ├── manifest.json
│   ├── sw.js                     # Service Worker
│   └── icons/
└── styles/
    └── globals.css
```

---

## 9. 환경변수

| 변수 | 용도 | 노출 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | 클라이언트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | 클라이언트 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push | 클라이언트 |
| `VAPID_PRIVATE_KEY` | Web Push | 서버 전용 |
| `OPENAI_API_KEY` | AI | Edge Function 전용 |
| `STRIPE_SECRET_KEY` | 결제 | 서버 전용 |
| `STRIPE_WEBHOOK_SECRET` | Webhook | 서버 전용 |
| `NEXT_PUBLIC_APP_URL` | OAuth 리다이렉트 | 클라이언트 |

---

## 10. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| **성능** | LCP ≤ 2.5s, 대시보드 TTI ≤ 3s |
| **SEO** | 랜딩 Lighthouse SEO ≥ 90 |
| **보안** | CSP, CSRF, HttpOnly cookie (Supabase SSR) |
| **접근성** | WCAG 2.1 AA, 키보드 전체 탐색 |
| **브라우저 지원** | Chrome 90+, Edge 90+, Firefox 90+, Safari 16+ |
| **반응형** | 320px ~ 2560px |

---

## 11. 개발 로드맵

### P0 — MVP (4~5주)

- [ ] Next.js + Supabase Auth (Google, Email)
- [ ] 랜딩 + 대시보드 + 상세 + 설정
- [ ] MediaRecorder 음성 녹음 + VAD + `/voice/parse` 연동
- [ ] schedules CRUD + Supabase Realtime
- [ ] Web Push (VAPID) + Service Worker
- [ ] PWA manifest + 설치 안내
- [ ] 반응형 (모바일 / 데스크톱)

### P1 — Growth (3~4주)

- [ ] 주간/월간 캘린더 뷰
- [ ] Stripe Checkout + 고객 포털
- [ ] Google Calendar OAuth 동기화
- [ ] 검색·필터·일괄 완료
- [ ] 스마트 스누즈 (프리셋 + 텍스트)
- [ ] 중복 알림 방지 (앱 vs 웹 설정)

### P2 — Enhancement

- [ ] Outlook/Apple Calendar 연동
- [ ] 팀 대시보드
- [ ] 주간 AI 요약 리포트 (이메일)
- [ ] 키보드 단축키 커스터마이즈
- [ ] 다국어 (영어)

---

## 12. 플랫폼별 기능 매트릭스

| 기능 | 모바일 앱 | 웹 |
|------|-----------|-----|
| 음성 즉시 파싱 | ✅ (자동 시작) | ✅ (제스처 필요) |
| 백그라운드 녹음 | ⚠️ 제한적 | ❌ |
| 풍부한 Push (전화/지도) | ✅ | ⚠️ (상세 페이지에서) |
| 주간/월간 캘린더 | P1 | ✅ P0 |
| Stripe 결제 | P1 | ✅ P1 (주요 채널) |
| 홈 위젯 | P1 | ❌ |
| PWA 설치 | ❌ | ✅ |
| Apple Watch | P2 | ❌ |
| 오프라인 읽기 | P2 | ✅ (PWA) |

---

## 13. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Safari Web Push 제한 | 중간 | PWA + macOS 16.4+ 안내, 앱 설치 유도 |
| 브라우저 마이크 탭 활성 필수 | 중간 | 스페이스바 단축키 UX, 텍스트 대체 |
| Web Push 액션 제한 | 중간 | 상세 페이지 풍부한 액션 |
| SEO vs 앱 로그인 분리 | 낮음 | 동일 Supabase Auth SSO |

---

## 14. 부록

### 14.1 랜딩 페이지 섹션

1. 히어로: "말 한마디로 끝내는 3초 일정 관리"
2. 데모 영상 / GIF (음성 → 일정)
3. 사용 사례 (영업, 강사, 현장)
4. 모바일 앱 vs 웹 비교
5. 요금제 (Starter / Pro / Team)
6. App Store / Play Store + "웹에서 시작" 행동 유도

### 14.2 관련 문서

- [제품 개요 PRD](./PRD-Overview.md)
- [모바일 애플리케이션 PRD](./PRD-Mobile.md)
- API 상세 스펙 (별도 작성 예정)
- 디자인 시스템 (별도 작성 예정)
