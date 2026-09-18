# 🌱 그루 (Groo)

식물의 성장을 사진으로 기록하는 다이어리.
사진을 올리면 촬영일시를 자동으로 추출하고, AI에게 식물 상태를 물어볼 수 있습니다.

> 기획 문서 전체는 **[docs/](./docs/)** 에 있습니다. 먼저 [docs/README.md](./docs/README.md)를 보세요.

## 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | React 19 + Vite 8 + TypeScript 6 |
| 라우팅 | React Router 8 (declarative mode) |
| 서버 상태 | TanStack Query 5 |
| 클라이언트 상태 | Zustand 5 |
| 검증 | zod 4 |
| 스타일 | Tailwind CSS 4 |
| 백엔드 | Supabase (Postgres + Auth + Storage + Edge Functions) |
| AI | Claude API (vision) |

## 시작하기

```bash
npm install
cp .env.example .env.local   # Supabase 값 채우기
npm run dev                  # http://localhost:5173
```

Supabase 연결과 키 발급 절차는 [docs/13-CLI.md](./docs/13-CLI.md) 참고.

## 스크립트

```bash
npm run dev        # 개발 서버
npm run build      # 타입체크 + 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
npm run lint       # oxlint
npm run format     # prettier
npm run typecheck  # tsc --noEmit
npm run test       # vitest (watch)
npm run test:run   # vitest 1회
npm run types:gen  # Supabase 타입 재생성
npm run db:push    # 마이그레이션 적용
```

## 구조

```
src/
├── components/   UI 컴포넌트
├── hooks/        커스텀 훅
├── lib/          supabase 클라이언트 · 순수 함수(dday, watering, exifDate) · zod 스키마
├── router/       라우트 정의
├── stores/       Zustand
├── types/        supabase gen types 결과
├── test/         vitest 셋업
├── App.tsx
├── main.tsx
└── index.css
```

`api/`(Supabase 쿼리 함수)와 `pages/`(화면)는 실제 기능을 붙일 때 추가합니다.
경로 별칭은 `@` → `src/` 하나입니다.

## 현재 상태

MVP F1~F8 코드는 전부 작성되어 있습니다. 남은 건 배포/설정입니다.

- ✅ 프로젝트 셋업, 디자인 토큰, 반응형 셸, 라우팅
- ✅ `src/lib` 순수 함수 + 테스트 21개
- ✅ DB 마이그레이션 3개 (스키마 / RLS / Storage)
- ✅ 소셜 로그인, 식물 CRUD, 일지 작성, EXIF 추출, 타임라인, 물주기, 캘린더, 설정
- ✅ AI 진단 Edge Function (`supabase/functions/analyze-plant`)
- ⏸️ `supabase login` → `db:push` → `types:gen` (브라우저 인증 필요)
- ⏸️ Supabase 대시보드에서 Google / Apple / Kakao OAuth 설정
- ⏸️ `supabase secrets set ANTHROPIC_API_KEY=...` → `functions deploy analyze-plant`

로드맵은 [docs/12-ROADMAP.md](./docs/12-ROADMAP.md).
