# 13. CLI 전체 기록

## 확인된 환경 (2026-09-16)

```bash
node -v     # v26.8.2
npm -v      # 11.19.1
git --version   # 2.55.0
pnpm        # 없음 (corepack도 없음) → npm 사용
```

> **왜 npm인가**: `corepack`이 설치되어 있지 않아 pnpm을 쓰려면 별도 전역 설치가 필요했다.
> pnpm을 쓰고 싶다면: `npm i -g pnpm` 후 `pnpm import`로 전환 가능.

---

## 1. 프로젝트 생성 (실행 완료)

```bash
cd /Users/heejungyoo/Desktop/study
npm create vite@latest groo -- --template react-ts
```

`--` 뒤의 인자가 create-vite로 전달된다. 이 형태면 **대화형 프롬프트 없이** 바로 생성된다.

생성 결과: `create-vite@9.2.1` → Vite 8.3 / React 19.2 / TypeScript 6.0 / oxlint

---

## 2. 런타임 의존성 (실행 완료)

```bash
cd /Users/heejungyoo/Desktop/study/groo

npm install \
  react-router@^8 \
  zustand \
  @tanstack/react-query \
  @supabase/supabase-js \
  zod \
  react-hook-form @hookform/resolvers \
  exifr \
  date-fns \
  clsx tailwind-merge \
  lucide-react \
  motion
```

| 패키지 | 설치된 버전 | 용도 |
|---|---|---|
| `react-router` | 8.4.0 | 라우팅 (declarative mode) |
| `zustand` | 5.0.15 | UI 상태 |
| `@tanstack/react-query` | 5.102.8 | 서버 상태 |
| `@supabase/supabase-js` | 2.116.0 | 백엔드 |
| `zod` | 4.6.5 | 검증 (폼 + API + AI 출력) |
| `react-hook-form` | 7.88.0 | 폼 |
| `exifr` | 7.1.3 | EXIF 파싱 |
| `date-fns` | 4.4.0 | 날짜 처리 |
| `clsx` + `tailwind-merge` | 2.1.1 / 3.7.0 | 클래스명 병합 |
| `lucide-react` | 1.46.0 | 아이콘 |
| `motion` | 13.3.0 | 애니메이션 |

> **axios는 설치하지 않았다.** 이유는 [05-ARCHITECTURE.md](./05-ARCHITECTURE.md) 참고.

---

## 3. 개발 의존성 (실행 완료)

```bash
npm install -D \
  tailwindcss @tailwindcss/vite \
  prettier \
  vitest jsdom @testing-library/react @testing-library/jest-dom @vitest/coverage-v8 \
  supabase
```

| 패키지 | 버전 | 용도 |
|---|---|---|
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | 스타일 (v4는 Vite 플러그인 방식) |
| `prettier` | 3.9.6 | 포맷팅 (oxlint는 린트만) |
| `vitest` + `jsdom` + Testing Library | 5.0.1 | 테스트 |
| `supabase` | 2.117.0 | Supabase CLI (마이그레이션, 타입 생성) |

> 린터는 Vite 템플릿이 기본 제공한 **oxlint**를 그대로 쓴다.
> 원래 계획은 Biome이었으나, 이미 설정된 oxlint가 같은 목적(Rust 기반 고속 린터)을
> 달성하므로 불필요한 교체를 하지 않았다.

---

## 4. 폴더 구조 생성 (실행 완료)

```bash
mkdir -p docs \
  src/{api,pages,hooks,stores,types} \
  src/components/{ui,layout,plants,entries,ai} \
  src/lib/schemas \
  src/router \
  supabase/migrations supabase/functions/_shared
```

---

## 5. 앞으로 직접 실행하실 명령어

### 개발 서버

```bash
cd /Users/heejungyoo/Desktop/study/groo
npm run dev          # http://localhost:5173
```

### Git 초기화

```bash
cd /Users/heejungyoo/Desktop/study/groo
git init
git add -A
git commit -m "chore: 프로젝트 초기 설정 및 기획 문서"
```

### Supabase 연결 (⚠️ 계정 필요)

```bash
# 1. 로그인 — 브라우저가 열립니다
npx supabase login

# 2. 프로젝트 생성은 웹 대시보드에서
#    https://supabase.com/dashboard → New project
#    · Region: Northeast Asia (Seoul) 선택
#    · DB 비밀번호는 안전한 곳에 저장

# 3. 로컬 프로젝트와 연결 (프로젝트 ref는 대시보드 URL에서 확인)
npx supabase link --project-ref <your-project-ref>

# 4. 마이그레이션 적용
npx supabase db push

# 5. TypeScript 타입 생성
npx supabase gen types typescript --linked > src/types/database.ts
```

### Edge Function 배포 (⚠️ Anthropic API 키 필요)

```bash
# 시크릿 설정
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set AI_MODEL=claude-opus-5
npx supabase secrets set AI_DAILY_QUOTA=5
npx supabase secrets set AI_MONTHLY_CALL_CAP=20000

# 로컬 테스트
npx supabase functions serve analyze-plant

# 배포
npx supabase functions deploy analyze-plant
```

### 검증 명령

```bash
npx tsc --noEmit      # 타입 체크
npx oxlint            # 린트
npx prettier --write .  # 포맷
npx vitest run        # 테스트
npm run build         # 프로덕션 빌드
npm run preview       # 빌드 결과 확인
```

### 배포

```bash
# Vercel
npx vercel

# 또는 Cloudflare Pages
npx wrangler pages deploy dist
```

---

## 6. 등록해둔 npm 스크립트

```bash
npm run dev          # 개발 서버
npm run build        # 타입체크 + 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run lint         # oxlint
npm run format       # prettier 적용
npm run typecheck    # tsc --noEmit
npm run test         # vitest (watch)
npm run test:run     # vitest 1회 실행
npm run types:gen    # Supabase 타입 재생성
npm run db:push      # 마이그레이션 적용
npm run db:diff      # 스키마 변경분 확인
```

---

## 7. 계정/키 준비 체크리스트

개발을 진행하려면 아래가 필요합니다. **직접 발급받으셔야 합니다.**

| # | 항목 | 어디서 | 필요 시점 |
|---|---|---|---|
| 1 | Supabase 계정 + 프로젝트 | [supabase.com](https://supabase.com) | W1 |
| 2 | Google OAuth 클라이언트 | [Google Cloud Console](https://console.cloud.google.com) | W2 |
| 3 | Apple Developer 계정 ($99/년) | [developer.apple.com](https://developer.apple.com) | W2 |
| 4 | **Kakao Developers 앱** | [developers.kakao.com](https://developers.kakao.com) | W2 |
| 5 | Anthropic API 키 | [console.anthropic.com](https://console.anthropic.com) | W4 |
| 6 | 도메인 (선택) | 가비아 / Cloudflare | W6 |

### ⚠️ Apple 로그인 주의

Apple Developer Program은 **연 $99(약 14만원)**가 든다.
웹 전용 MVP 단계에서는 **Google + Kakao만으로 시작**하고,
Apple은 네이티브 앱을 낼 때(어차피 계정이 필요해지는 시점) 추가하는 것을 권한다.

→ MVP 로그인: **Google + Kakao 2종**
