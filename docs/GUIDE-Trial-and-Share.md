# 볼륨비서 — 체험 및 공유 가이드

> 배포 없이, 내 PC에서 먼저 써보고 주변 사람에게 소개하는 방법

---

## 1. 파일은 이미 내 PC에 있습니다

프로젝트 위치:

```
C:\Users\admin\Desktop\my-first-project\
├── voice-secretary\     ← 모바일 앱 (Expo)
├── docs\                ← PRD 문서
├── supabase\            ← Edge Function 소스 (배포 전)
└── PRD.md
```

별도 다운로드 없이 위 폴더를 그대로 사용하면 됩니다.  
다른 사람에게 **소스 코드**를 넘기려면 `my-first-project` 폴더를 ZIP으로 압축해 전달하면 됩니다.

---

## 2. 시작 전 준비 (최초 1회)

### ① Node.js 설치

1. [https://nodejs.org](https://nodejs.org) 접속
2. **LTS 버전** (20 이상) 다운로드 및 설치
3. 설치 후 **PowerShell을 새로 열고** 확인:

```powershell
node -v
npm -v
```

### ② Expo Go 앱 설치 (스마트폰)

| OS | 설치 |
|----|------|
| iPhone | App Store → "Expo Go" 검색 |
| Android | Play Store → "Expo Go" 검색 |

주변 사람에게 소개할 때도, 상대방 폰에 **Expo Go**만 설치하면 됩니다.

---

## 3. 내 PC에서 앱 실행하기

### ⚠️ PowerShell에서 `node` / `npm`을 찾을 수 없다면

Node.js는 설치되어 있지만 **PATH(환경 변수)에 등록되지 않은 경우**가 많습니다.

**가장 쉬운 방법 — 실행 스크립트 사용:**

`voice-secretary` 폴더에서 **`start.bat`** 파일을 더블클릭  
또는 PowerShell에서:

```powershell
cd C:\Users\admin\Desktop\my-first-project\voice-secretary
.\start.ps1
```

> PowerShell 실행 정책 오류 시: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 후 재시도

**또는 PowerShell을 완전히 닫았다가 새로 연 뒤:**

```powershell
cd C:\Users\admin\Desktop\my-first-project\voice-secretary
npm install
npx expo start
```

**PATH 수동 확인 (선택):**

```powershell
node -v
```

`node`를 찾을 수 없다는 오류가 나오면, Node.js를 **한 번 더 설치**하거나 PC **재부팅** 후 다시 시도하세요.

---

### 정상 실행 시

PowerShell에서:

```powershell
cd C:\Users\admin\Desktop\my-first-project\voice-secretary
npm install
npx expo start
```

터미널에 **QR 코드**가 나타납니다.

- **iPhone:** 카메라 앱으로 QR 스캔 → Expo Go에서 열기
- **Android:** Expo Go 앱 안에서 QR 스캔

> PC와 폰이 **같은 Wi-Fi**에 연결되어 있어야 합니다.

---

## 4. 배포 없이도 되는 것 / 안 되는 것

| 기능 | 배포 없이 가능? | 설명 |
|------|----------------|------|
| 회원가입·로그인 | ✅ | Supabase 클라우드 DB 이미 연결됨 |
| **텍스트로 일정 등록** | ✅ | 마이크 버튼 **길게 누르기** → 텍스트 입력 |
| 일정 목록·수정·삭제 | ✅ | |
| 알림 (로컬) | ✅ | 앱 설치 후 권한 허용 |
| **음성 녹음 → AI 변환** | ⚠️ 제한 | Edge Function 미배포 시 텍스트 입력 사용 |
| 앱스토어 배포 | ❌ | 나중에 필요 시 진행 |

### 체험용 추천 입력 예시

마이크 버튼을 **길게 누른 뒤** 아래 문장을 입력해 보세요.

```
내일 오후 2시 김과장 미팅
```

```
모레 오전 10시 자재 발주
```

```
오늘 오후 4시 30분 통화
```

---

## 5. 주변 사람에게 소개하는 방법

### 방법 A — 옆에서 QR로 바로 체험 (가장 쉬움)

1. 내 PC에서 `npx expo start` 실행
2. 상대방 폰에 Expo Go 설치
3. QR 코드 스캔 → 앱 실행
4. 회원가입 후 텍스트로 일정 등록 시연

**한 줄 소개:**

> "말로 일정 넣는 앱인데, 지금은 텍스트로 '내일 2시 미팅' 치면 AI가 시간·제목을 알아서 일정으로 저장해 줘."

### 방법 B — Wi-Fi가 다를 때 (터널 모드)

같은 Wi-Fi가 아니면:

```powershell
npx expo start --tunnel
```

QR 코드를 캡처해서 카톡·문자로 보내면, 멀리 있는 사람도 Expo Go로 열 수 있습니다.  
(처음 실행 시 Expo 계정 로그인이 필요할 수 있습니다.)

### 방법 C — 프로젝트 ZIP 공유 (개발자/관심 있는 사람)

1. `my-first-project` 폴덈 ZIP 압축
2. Node.js + Expo Go 설치 안내와 함께 전달
3. 위 **§3** 절차대로 실행

---

## 6. 체험 시연 순서 (3분 데모)

| 순서 | 동작 | 말할 내용 (예시) |
|------|------|------------------|
| 1 | 앱 실행 → 회원가입 | "이메일로 가입하면 바로 씁니다" |
| 2 | 온보딩 → 마이크·알림 허용 | "음성·알림 권한만 켜면 됩니다" |
| 3 | 🎤 **길게 누르기** → 텍스트 입력 | "운전 중엔 말로, 지금은 타이핑으로 보여드릴게요" |
| 4 | `내일 오후 2시 김과장 미팅` 입력 | |
| 5 | 분석 결과 → 자동 저장 | "3초 뒤 자동 저장, 제목·시간 AI가 뽑아줍니다" |
| 6 | 홈 일정 카드 탭 → 수정 | "틀리면 여기서 고칠 수 있어요" |
| 7 | 5분 미루기 / 완료 | "알람 미루기·완료 처리도 됩니다" |

---

## 7. 자주 묻는 질문

**Q. QR 찍고 무한 로딩이 걸려요**  
A. 아래 순서대로 시도하세요.

1. 실행 중인 터미널 창을 **Ctrl+C**로 종료
2. **`start-tunnel.bat`** 더블클릭 (Wi-Fi가 달라도 연결됨)
3. 새 QR 코드로 다시 스캔
4. Expo Go 앱을 **최신 버전**으로 업데이트 (Play Store / App Store)
5. PC **Windows 방화벽**에서 Node.js 허용

같은 Wi-Fi라면 `start.bat`로도 됩니다. PC와 폰이 **같은 네트워크**인지 확인하세요.

**Q. 돈 드나요?**  
A. 지금 체험 단계는 **무료**입니다. Supabase 무료 플랜 + Expo Go + 텍스트 파서 사용.

**Q. 앱스토어에 있나요?**  
A. 아직 없습니다. Expo Go로 미리보기 체험하는 단계입니다.

**Q. 음성으로는 왜 안 되나요?**  
A. 음성→텍스트 변환(STT)은 서버 배포 + OpenAI 키가 필요합니다. 소개·체험 단계에서는 **텍스트 입력**으로 같은 기능을 보여주면 됩니다.

**Q. 내 일정 데이터는 어디 저장되나요?**  
A. Supabase 클라우드 DB에 계정별로 저장됩니다. 로그인한 계정에서만 볼 수 있습니다.

---

## 8. 다음 단계 (원할 때만)

| 목표 | 할 일 |
|------|------|
| 음성 STT 추가 | Edge Function 배포 + OpenAI API 키 |
| 더 많은 사람에게 공유 | Expo EAS Build 또는 앱스토어 출시 |
| 웹 버전 | PRD-Web.md 기준 Next.js 개발 |

지금은 **§3 실행 → §5 QR 공유**만으로 충분히 체험·소개할 수 있습니다.

---

## 9. 관련 문서

- [앱 README](../voice-secretary/README.md)
- [제품 개요 PRD](./PRD-Overview.md)
- [모바일 PRD](./PRD-Mobile.md)
