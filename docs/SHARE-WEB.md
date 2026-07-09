# 볼륨비서 — PC 브라우저 공유 가이드

> Expo Go QR 없이, **PC/스마트폰 브라우저**로 체험·공유하는 방법

---

## 방법 1 — 내 PC에서 바로 (가장 빠름)

`voice-secretary\start-web.bat` 더블클릭

→ 브라우저가 자동으로 열립니다.

---

## 방법 2 — 주변 사람에게 Wi-Fi로 공유

1. `voice-secretary\share-web.bat` 더블클릭
2. 터미널에 나오는 주소 복사 (예: `http://192.168.0.10:4173`)
3. **같은 Wi-Fi**에 연결된 사람에게 카톡/문자로 전송
4. 상대방은 **Chrome/Edge/Safari**에서 주소만 열면 됩니다

> 앱 설치 불필요. 브라우저만 있으면 됩니다.

---

## 방법 3 — ZIP 파일로 공유 (오프라인/다른 PC)

1. `voice-secretary\build-web.bat` 실행 → `dist` 폴더 생성
2. `dist` 폴더를 ZIP으로 압축
3. 상대방 PC에 전달

상대방 실행 방법:

```powershell
cd dist
npx serve -l 4173
```

브라우저에서 `http://localhost:4173` 접속

---

## 방법 4 — 인터넷 URL로 공유 (무료 Vercel)

터미널에서 (Node.js 설치 후):

```powershell
cd voice-secretary
npm install -g vercel
vercel login
npm run build:web
vercel deploy dist --prod
```

완료 후 `https://xxxxx.vercel.app` URL을 누구에게나 공유 가능합니다.

---

## 웹 사용법

1. **회원가입** (이메일 + 비밀번호)
2. 🎤 버튼 클릭 → 텍스트 입력
3. 예: `내일 오후 2시 김과장 미팅`
4. **분석** → 자동 저장 → 일정 목록 확인

---

## 모바일 앱(Expo Go) vs 웹

| | Expo Go (QR) | PC 브라우저 (웹) |
|--|--------------|------------------|
| 설치 | Expo Go 필요 | **불필요** |
| 공유 | QR / Tunnel | **URL / ZIP** |
| 음성 녹음 | 가능(설정 필요) | 텍스트 입력 |
| 추천 | 본인 테스트 | **주변 소개** |

---

## 문제 해결

**페이지가 안 열려요**  
→ Windows 방화벽에서 Node.js 허용  
→ PC와 상대방이 같은 Wi-Fi인지 확인

**로그인이 안 돼요**  
→ Supabase 연결 확인 (인터넷 필요)

**빌드 오류**  
→ `npm install` 후 `npm run build:web` 재실행
