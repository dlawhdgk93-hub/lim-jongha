# 볼륨비서 (VoiceSecretary) — 모바일 애플리케이션 PRD

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-07-04 |
| 플랫폼 | iOS / Android (React Native + Expo) |
| 대상 릴리스 | MVP (v0.1) |

---

## 1. 제품 개요

### 1.1 제품 정의

| 항목 | 내용 |
|------|------|
| **제품명** | 볼륨비서 (VoiceSecretary) |
| **한 줄 소개** | 말 한마디로 끝내는 3초 일정 관리 비서 |
| **플랫폼 포지셔닝** | 이동 중·현장 업무에 최적화된 **모바일 우선** 일정 관리 앱 |

### 1.2 핵심 가치 제안

입력 마찰(Input Friction)을 제거하여, 운전 중·현장 작업 중·장갑 착용 등 **손이 자유롭지 않은 상황**에서도 음성 한마디로 일정을 등록하고, 맥락 기반 알림으로 후속 액션까지 즉시 실행할 수 있게 한다.

### 1.3 모바일 플랫폼 선정 이유

| 기술 | 선정 이유 |
|------|-----------|
| **React Native (Expo)** | iOS/Android 단일 코드베이스, 마이크·푸시·위젯 등 네이티브 API 접근 용이 |
| **Supabase** | 인증, Realtime DB, Edge Functions로 AI API 연동 및 백엔드 신속 구축 |
| **OpenAI Whisper + GPT-4o-mini** | 업계 수준 STT 및 자연어 일정 파싱 |
| **Expo Push Notifications** | iOS/Android 통합 푸시, 풍부한 알림(액션 버튼) 지원 |

### 1.4 성공 지표 (KPI) — MVP

| 지표 | 목표 |
|------|------|
| 음성 → 일정 저장 완료율 | ≥ 85% |
| 음성 입력 → 저장까지 소요 시간 | ≤ 5초 (P95) |
| D1 재방문율 | ≥ 40% |
| 푸시 알림 액션 버튼 클릭률 | ≥ 15% |

---

## 2. 사용자 정의

### 2.1 페르소나

| 페르소나 | 특성 | 핵심 니즈 |
|----------|------|-----------|
| **현장 영업 (김대리, 32)** | 하루 5~8회 외부 미팅, 운전 시간 多 | 상담 직후 운전 중 음성으로 다음 미팅 예약 |
| **프리랜서 강사 (박트레이너, 28)** | 수업 간 휴식 5분, 손이 젖거나 바쁨 | 수업 종료 즉시 다음 수업 시간 음성 기록 |
| **현장 소장 (이소장, 45)** | 장갑·먼지 환경, 타이핑 불가 | 자재 발주 기한 등을 음성 명령으로 설정 |

### 2.2 보조 사용자

- 업무 효율을 높이고 싶은 일반 직장인
- 멀티태스킹이 필요한 개인 사용자 (육아, 요리 등)

### 2.3 유저 스토리

| ID | 사용자로서 | 원하는 것 | 목적 | 우선순위 |
|----|-----------|-----------|------|----------|
| US-M01 | 현장 영업직 | 상담 직후 운전 중 음성으로 다음 미팅 예약 | 타이핑 없이 일정 누락 방지 | P0 |
| US-M02 | PT 트레이너 | 수업 종료 직후 음성으로 다음 수업 기록 | 수기 메모보다 빠르고 분실 없음 | P0 |
| US-M03 | 현장 소장 | 자재 발주 기한을 음성으로 설정 | 장갑 벗고 폰 조작할 필요 없음 | P0 |
| US-M04 | 모든 사용자 | 알람 수신 시 전화/지도 버튼으로 즉시 액션 | 알림 → 앱 → 액션 단계 제거 | P0 |
| US-M05 | 모든 사용자 | 알람 울릴 때 "10분 뒤" 음성으로 미루기 | 손 조작 없이 스누즈 | P1 |

---

## 3. 핵심 기능 명세

### 3.1 즉시 음성 분석기 — P0

#### 설명
앱 실행 즉시 또는 홈 위젯 터치 한 번으로 음성 녹음을 시작하고, AI가 날짜·시간·내용을 추출하여 일정을 자동 등록한다.

#### 사용자 흐름

```
앱 실행 / 위젯 탭
    → 마이크 자동 활성화 (권한 없으면 권한 요청)
    → 음성 입력 (최대 30초, 3초 무음 시 자동 종료)
    → 로딩 UI (파형 + "분석 중...")
    → 파싱 결과 미리보기 (3초 카운트다운 후 자동 저장)
    → [선택] 상세 화면에서 수정
    → 홈 일정 리스트 갱신
```

#### 입력 / 출력

| 구분 | 내용 |
|------|------|
| **입력** | 음성 스트림 (m4a/wav, mono, 16kHz 권장) |
| **출력** | `Schedule` 객체: `date`, `time`, `content`, `location_info?`, `contact_info?` |

#### 비즈니스 규칙

| 규칙 ID | 내용 |
|---------|------|
| BR-V01 | 3초간 입력(음성) 없으면 녹음 종료 및 분석 시작 |
| BR-V02 | 파싱 실패 시 "다시 말해주세요" UI + 재녹음 버튼 표시 |
| BR-V03 | 날짜·시간 미추출 시 기본값: 오늘 + 현재 시각 + 1시간 |
| BR-V04 | Starter 플랜: 일 20회 음성 파싱 제한 |

#### UI 요구사항

- 홈 화면 중앙 **대형 마이크 버튼** (최소 72×72pt 터치 영역)
- 녹음 중 **펄스 애니메이션** + 실시간 파형 시각화
- 백그라운드에서도 **짧은 녹음** 가능 (iOS: Audio Session `playAndRecord`)

#### 기술 구현

- `expo-av` 또는 `expo-audio`로 녹음
- `POST /api/v1/voice/parse` → Supabase Edge Function → Whisper STT → GPT-4o-mini 파싱
- 오프라인 시: 로컬 큐에 저장, 네트워크 복구 시 자동 전송 (P2)

---

### 3.2 맥락 기반 푸시 알람 — P0

#### 설명
알람 시점에 단순 텍스트 외에 **전화 걸기**, **지도 보기**, **완료 처리** 등 맥락 액션 버튼을 포함한 풍부한 알림을 발송한다.

#### 사용자 흐름

```
일정 target_timestamp 도달
    → Expo Push / FCM / APNs 발송
    → 풍부한 알림 수신 (잠금 화면 포함)
    → 액션 버튼 탭 (예: 📞 전화)
    → 네이티브 전화 / 지도 앱 즉시 실행
```

#### 입력 / 출력

| 구분 | 내용 |
|------|------|
| **입력** | Schedule 데이터, `contact_info`, `location_info` |
| **출력** | 액션 버튼 포함 푸시 알림 |

#### 알림 액션 매트릭스

| 조건 | 표시 버튼 | 동작 |
|------|-----------|------|
| `contact_info.phone` 존재 | 📞 전화 | `Linking.openURL('tel:...')` |
| `location_info` 존재 | 🗺️ 지도 | Apple Maps / Google Maps 딥링크 |
| 항상 | ✅ 완료 | `PATCH /schedules/{id}` status → completed |
| 항상 | ⏰ 5분 미루기 | status → snoozed, +5분 |

#### 비즈니스 규칙

| 규칙 ID | 내용 |
|---------|------|
| BR-N01 | 일정 10분 전·정각 2회 알림 (설정에서 변경 가능) |
| BR-N02 | 앱 종료/백그라운드 상태에서도 푸시 수신 보장 |
| BR-N03 | iOS: Notification Service Extension으로 풍부한 UI (P1) |

---

### 3.3 스마트 스누즈 (음성 기반 미루기) — P1

#### 설명
알람 팝업 또는 알림 확장 영역에서 음성으로 "10분 뒤에 다시 알려줘"라고 명령하여 알람을 즉시 재설정한다.

#### 사용자 흐름

```
알람 팝업 / 풀스크린 알람 UI
    → 🎤 버튼 탭 (또는 알람 시 자동 활성화)
    → "5분 뒤" / "30분 뒤" / "1시간 뒤" 발화
    → GPT 파싱 → target_timestamp 갱신
    → "5분 후 다시 알려드릴게요" 토스트
```

#### 지원 음성 패턴 (MVP)

- "N분 뒤", "N시간 뒤", "오후 3시에", "내일 아침 9시에"

---

## 4. 화면 구조 및 네비게이션

### 4.1 화면 목록

| 화면 | 경로 | 설명 |
|------|------|------|
| **스플래시 / 인증** | `/` | 로그인·회원가입 (이메일, Google, Apple) |
| **홈 (대시보드)** | `/home` | 중앙 마이크 버튼 + 오늘 일정 리스트 |
| **일정 상세** | `/schedule/:id` | AI 파싱 결과 확인·수정 |
| **설정** | `/settings` | 플랜, 알림, 캘린더 연동 |
| **온보딩** | `/onboarding` | 권한 요청 (마이크, 푸시) |

### 4.2 Home 화면 와이어프레임 (텍스트)

```
┌─────────────────────────────┐
│  볼륨비서        ⚙️         │
├─────────────────────────────┤
│                             │
│      ┌─────────────┐        │
│      │   🎤 72pt   │        │  ← 탭/앱 실행 시 자동 녹음
│      │  말해보세요  │        │
│      └─────────────┘        │
│                             │
│  ── 오늘 남은 일정 ──        │
│  ┌─────────────────────┐    │
│  │ 14:00  김과장 미팅   │ 📞│
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ 16:30  자재 발주    │ 🗺️│
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

### 4.3 이동 흐름

```
스플래시 → (미로그인) 인증 → 온보딩(최초) → 홈
홈 → [녹음] → 분석 대기 → (자동 저장 | 상세 수정) → 홈
홈 → 일정 카드 탭 → 상세 → 홈
홈 → 설정
푸시 알림 → 상세 | 네이티브 액션
```

### 4.4 네비게이션 스택

- **루트 스택:** 인증 | 메인 (탭)
- **메인 탭:** 홈 | (향후 캘린더) | 설정
- **모달:** 음성 녹음 오버레이, 알람 풀스크린 (P1)

---

## 5. 데이터 모델

### 5.1 ERD (개념)

```
Users 1──N Schedules
Users 1──1 Subscriptions
Users 1──N PushTokens
```

### 5.2 테이블 스키마

#### users (Supabase Auth 확장)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | Supabase Auth UID |
| email | text | |
| plan_type | enum | `starter` \| `pro` \| `team` |
| created_at | timestamptz | |

#### schedules

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| raw_text | text | Whisper STT 원문 |
| parsed_content | jsonb | `{ title, date, time, notes }` |
| target_timestamp | timestamptz | 알람 기준 시각 |
| location_info | jsonb | `{ address, lat, lng, place_name }` |
| contact_info | jsonb | `{ name, phone, email }` |
| status | enum | `pending` \| `completed` \| `snoozed` |
| created_at | timestamptz | |

#### push_tokens

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| expo_push_token | text | |
| platform | enum | `ios` \| `android` |
| updated_at | timestamptz | |

#### subscriptions

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| stripe_customer_id | text | |
| status | enum | `active` \| `canceled` \| `past_due` |
| current_period_end | timestamptz | |

---

## 6. API 설계

기본 URL: `https://{project}.supabase.co/functions/v1`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/api/v1/voice/parse` | 음성 → 일정 파싱 | Bearer |
| GET | `/api/v1/schedules` | 일정 목록 (`?date=`, `?status=`) | Bearer |
| GET | `/api/v1/schedules/{id}` | 일정 상세 | Bearer |
| POST | `/api/v1/schedules` | 일정 생성 | Bearer |
| PATCH | `/api/v1/schedules/{id}` | 수정·상태 변경·스누즈 | Bearer |
| DELETE | `/api/v1/schedules/{id}` | 삭제 | Bearer |
| POST | `/api/v1/notifications/send` | 내부 스케줄러 트리거 | Service Key |
| POST | `/api/v1/push/register` | Expo Push Token 등록 | Bearer |

### 6.1 POST /api/v1/voice/parse

**요청:** `multipart/form-data` — `audio` (파일), `locale` (선택, 기본값 `ko-KR`)

**응답:**
```json
{
  "schedule": {
    "raw_text": "내일 오후 2시 김과장 미팅",
    "parsed_content": {
      "title": "김과장 미팅",
      "date": "2026-07-05",
      "time": "14:00"
    },
    "target_timestamp": "2026-07-05T05:00:00.000Z",
    "location_info": null,
    "contact_info": { "name": "김과장", "phone": null }
  },
  "confidence": 0.92
}
```

---

## 7. 인증 및 권한

### 7.1 인증

| 방식 | 플랫폼 | 우선순위 |
|------|--------|----------|
| Apple Sign In | iOS (App Store 필수) | P0 |
| Google Sign In | iOS, Android | P0 |
| 이메일 + 비밀번호 | 전체 | P0 |

### 7.2 디바이스 권한

| 권한 | 필수 | 사용 목적 | 거부 시 UX |
|------|------|-----------|------------|
| 마이크 | ✅ | 음성 일정 등록 | 앱 핵심 기능 불가, 설정 안내 |
| 푸시 알림 | ✅ | 일정 알람 | 로컬 알림 대체 (P1) |
| 연락처 | ❌ (Pro) | 연락처 자동 매칭 | 수동 입력 |

### 7.3 행 수준 보안 (Supabase RLS)

- `schedules`: `user_id = auth.uid()` CRUD만 허용
- `push_tokens`: 본인 토큰만 등록·수정

---

## 8. 프로젝트 구조

```
src/
├── components/
│   ├── VoiceButton.tsx       # 중앙 마이크 버튼 + 애니메이션
│   ├── ScheduleCard.tsx      # 일정 카드 (액션 아이콘)
│   ├── WaveformVisualizer.tsx
│   └── ParsingPreview.tsx    # AI 결과 미리보기
├── screens/
│   ├── HomeScreen.tsx
│   ├── DetailScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── AuthScreen.tsx
│   └── OnboardingScreen.tsx
├── services/
│   ├── openai.ts             # Edge Function 클라이언트
│   ├── supabase.ts
│   ├── pushNotification.ts
│   └── audioRecorder.ts
├── hooks/
│   ├── useAudioRecorder.ts
│   ├── useSchedules.ts
│   └── useVoiceParser.ts
├── utils/
│   ├── dateFormatter.ts
│   └── deepLinks.ts          # tel:, maps: URL 빌더
├── store/
│   └── scheduleStore.ts      # Zustand
├── constants/
│   ├── config.ts
│   └── plans.ts
└── navigation/
    └── RootNavigator.tsx
```

---

## 9. 환경변수

| 변수 | 용도 | 노출 |
|------|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase | 클라이언트 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase | 클라이언트 |
| `EXPO_PUBLIC_PROJECT_ID` | Expo Push | 클라이언트 |
| `OPENAI_API_KEY` | Whisper/GPT | Edge Function 전용 |
| `STRIPE_SECRET_KEY` | 결제 | Edge Function 전용 |

---

## 10. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| **성능** | 앱 콜드 스타트 ≤ 2초, 음성 파싱 API ≤ 3초 (P95) |
| **가용성** | API 가동률 ≥ 99.5% |
| **보안** | API Key 서버 전용, HTTPS, 토큰 SecureStore 저장 |
| **접근성** | VoiceOver/TalkBack 마이크 버튼 라벨, 최소 터치 44pt |
| **로컬라이제이션** | MVP: 한국어, v1.1: 영어 |

---

## 11. 개발 로드맵

### P0 — MVP (4~6주)

- [ ] Expo 프로젝트 셋업 + 인증 (이메일, Apple, Google)
- [ ] 마이크 녹음 + 3초 VAD 종료 + 서버 업로드
- [ ] Whisper/GPT 일정 파싱 Edge Function
- [ ] Supabase schedules CRUD + RLS
- [ ] 홈 / 상세 / 설정 화면
- [ ] Expo Push 기본 알림 (텍스트)
- [ ] 온보딩 권한 플로우

### P1 — Growth (3~4주)

- [ ] 풍부한 알림 액션 버튼 (전화, 지도, 완료, 스누즈)
- [ ] 스마트 스누즈 (음성)
- [ ] Stripe Pro 결제
- [ ] Google/Apple 캘린더 양방향 동기화
- [ ] iOS 홈 위젯 (빠른 녹음)

### P2 — Enhancement

- [ ] 오프라인 녹음 큐
- [ ] 주간 AI 요약 리포트
- [ ] Apple Watch / Wear OS 컴플리케이션
- [ ] 팀 플랜 (공유 일정)

---

## 12. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| App Store 마이크 백그라운드 제한 | 높음 | 포그라운드 녹음 UX, 위젯으로 재진입 단축 |
| Whisper API 지연/비용 | 중간 | GPT-4o-mini 경량 프롬프트, 캐싱 |
| 푸시 전달 불안정 | 중간 | 로컬 알림 대체, 중복 스케줄 |
| STT 한국어 방언/잡음 | 중간 | 노이즈 리덕션, 재녹음 UX |

---

## 13. 부록

### 13.1 플랜별 기능 매트릭스

| 기능 | Starter (무료) | Pro | Team |
|------|----------------|-----|------|
| 음성 파싱 | 20회/일 | 무제한 | 무제한 |
| 풍부한 Push | ✅ | ✅ | ✅ |
| 연락처 연동 | ❌ | ✅ | ✅ |
| 캘린더 동기화 | ❌ | ✅ | ✅ |
| 팀 공유 | ❌ | ❌ | ✅ |

### 13.2 관련 문서

- [웹 애플리케이션 PRD](./PRD-Web.md)
- [제품 개요 PRD](./PRD-Overview.md)
- API 상세 스펙 (별도 작성 예정)
