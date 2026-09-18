# 05. 서비스 아키텍처

## 전체 구조

```
┌────────────────────────────────────────────────────────────┐
│  Client — React 19 + Vite 8 + TypeScript (SPA)             │
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │ React Router │  │ TanStack      │  │ Zustand          │ │
│  │ v8           │  │ Query v5      │  │                  │ │
│  │ (declarative)│  │ = 서버 상태    │  │ = UI 상태만       │ │
│  └──────────────┘  └───────────────┘  └──────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  src/api · src/lib · src/types                     │    │
│  │  supabase 호출 · 순수 함수 · zod · DB 타입         │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────┬──────────────────────────┬──────────────────┘
               │ supabase-js              │ 이미지 파이프라인
               │ (PostgREST / Realtime)   │ (canvas 리사이즈)
               ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│  Supabase                                                   │
│                                                             │
│  ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Auth  │  │ Postgres │  │ Storage  │  │ Edge         │ │
│  │ OAuth  │  │  + RLS   │  │ private  │  │ Functions    │ │
│  │ G/A/K  │  │          │  │          │  │ (Deno)       │ │
│  └────────┘  └────┬─────┘  └──────────┘  └──────┬───────┘ │
│                   │                              │         │
│                   └── Realtime ──────────────────┘         │
│                       (AI 완료 이벤트 푸시)                  │
└──────────────────────────────────────────┬─────────────────┘
                                           │ API Key는 여기서만
                                           ▼
                                  ┌──────────────────┐
                                  │  Claude API      │
                                  │  (Vision)        │
                                  └──────────────────┘

배포: Vercel 또는 Cloudflare Pages (정적 SPA)
```

---

## 핵심 설계 결정 4가지

### 1. 백엔드 서버를 따로 두지 않는다

일반 CRUD는 클라이언트가 `supabase-js`로 Postgres를 직접 치고,
**권한은 RLS가 책임진다.** Express/Nest 레이어는 이 규모에서 순수 비용이다.

- 얻는 것: 서버 코드 0줄, 인프라 비용 0원, 배포가 정적 파일 업로드
- 잃는 것: 복잡한 트랜잭션·집계는 Postgres 함수(RPC)로 내려야 함 → 필요해지면 그때

### 2. 비밀이 필요한 일만 Edge Function

현재 유일한 케이스는 **AI 호출**이다. Claude API 키가 클라이언트 번들에 들어가면 안 되므로.

```
클라이언트가 직접 못 하는 일 = Edge Function으로
  · AI 호출 (API 키 보호)
  · AI 쿼터 증가 (클라가 조작 못 하게)
  · 회원 탈퇴 시 Storage 정리 (service_role 필요)
```

### 3. AI는 비동기

일지 저장은 즉시 끝내고, AI 분석은 백그라운드에서 돌려 Realtime으로 결과를 밀어준다.
**AI 응답을 기다리며 저장 버튼이 5초간 도는 UX는 최악이다.**

### 4. 서버 상태와 클라이언트 상태를 분리한다

| | 담당 | 예 |
|---|---|---|
| **TanStack Query** | 서버에서 온 모든 것 | 식물 목록, 일지, AI 결과, 프로필 |
| **Zustand** | 브라우저에만 있는 것 | 테마, 업로드 진행률, 열린 모달, 필터 상태 |

식물 목록을 Zustand에 넣으면 캐시 무효화·로딩·에러·리트라이를 전부 손으로 짜게 된다.
이건 TanStack Query가 이미 하는 일이다.

---

## 폴더 구조

```
groo/
├── docs/                      ← 이 기획 문서들
├── public/
│   ├── fonts/                 Pretendard self-host
│   ├── icons/                 PWA 아이콘
│   └── manifest.webmanifest
│
├── src/
│   ├── api/                   Supabase 호출 + TanStack Query 훅
│   │   ├── keys.ts            쿼리 키 팩토리 — 무효화 실수 방지
│   │   ├── plants.ts
│   │   ├── entries.ts
│   │   ├── photos.ts
│   │   └── ai.ts
│   │
│   ├── components/
│   │   ├── ui/                Button, Sheet, Dialog, Skeleton, Chip, Toast
│   │   ├── layout/            AppShell, Placeholder
│   │   ├── plants/            PlantCard, PlantForm, PlantGrid
│   │   ├── entries/           EntryComposer, PhotoPicker, Timeline, ActionChips
│   │   └── ai/                AiDiagnosisCard, AiAskButton, AiPendingSkeleton
│   │
│   ├── pages/                 화면 단위 컴포넌트
│   ├── hooks/                 useTheme, useMediaQuery
│   │
│   ├── lib/
│   │   ├── supabase.ts        Supabase 클라이언트
│   │   ├── constants.ts       BRAND, 활동 태그 라벨, 쿼터 상수
│   │   ├── cn.ts              clsx + tailwind-merge
│   │   ├── image.ts           canvas 리사이즈 / WebP 인코딩
│   │   ├── exif.ts            exifr 래퍼
│   │   ├── watering.ts        nextWateringDate(), isWateringDue()
│   │   ├── dday.ts            daysSince(), formatDday()
│   │   ├── exifDate.ts        resolveRecordedAt() — 폴백 로직
│   │   └── schemas/           zod — 폼 + API 응답 + AI 출력 검증
│   │       ├── plant.ts
│   │       ├── entry.ts
│   │       └── ai.ts
│   │
│   ├── router/
│   │   ├── index.tsx          라우트 트리
│   │   └── guards.tsx         RequireAuth
│   │
│   ├── stores/                Zustand
│   │   ├── uiStore.ts         테마, 사이드바, 모달
│   │   └── uploadStore.ts     업로드 큐 / 진행률
│   │
│   ├── types/
│   │   ├── database.ts        supabase gen types 결과 (자동 생성, 직접 수정 금지)
│   │   └── models.ts          앱에서 쓰는 도메인 타입 (Plant, Entry, Photo...)
│   │
│   ├── test/                  vitest 셋업
│   ├── main.tsx               진입점
│   ├── App.tsx
│   ├── providers.tsx          QueryClient, Theme, Auth
│   └── index.css              Tailwind @theme 토큰
│
└── supabase/
    ├── config.toml
    ├── migrations/            SQL 마이그레이션 (버전 관리)
    └── functions/
        ├── analyze-plant/     AI 진단
        ├── delete-account/    탈퇴 시 Storage 정리
        └── _shared/           cors, auth 헬퍼
```

### 규칙

```
pages · components  →  hooks · api · stores  →  lib · types
```

- `lib/`의 순수 함수(`watering`, `dday`, `exifDate`)는 React를 import 하지 않는다.
  덕분에 브라우저 없이 테스트된다 — 지금 21개가 그렇게 돌고 있다.
- 컴포넌트에서 supabase-js를 직접 부르지 않는다. `api/`를 거친다.
- 경로 별칭은 `@` → `src/` 하나.

---

## 스택 선정 근거

| 선택 | 버전 | 이유 |
|---|---|---|
| **React** | 19.3 | Compiler로 `useMemo`/`memo` 수동 최적화 거의 불필요. 타임라인처럼 리스트 많은 화면에 유리 |
| **Vite** | 8.3 | Rolldown 기반. 빌드 체감 속도 큼 |
| **TypeScript** | 6.0 | `strict: true` 필수 |
| **React Router** | 8.4 | **declarative(library) mode.** SSR 안 씀 — 아래 참고 |
| **TanStack Query** | 5.102 | 서버 상태. 캐시 무효화·낙관적 업데이트·리트라이 |
| **Zustand** | 5.0 | UI 상태. 서버 상태는 TanStack Query가 맡는다 |
| **zod** | 4.6 | 폼 + API 응답 + AI 출력 검증을 하나의 스키마로 |
| **Tailwind** | 4.3 | CSS-first(`@theme`). 설정 파일 사실상 없음 |
| **oxlint** | 1.81 | Rust 기반. Vite 템플릿 기본. ESLint flat config 지옥 회피 |
| **prettier** | 3.9 | 포맷팅 (oxlint는 린트만 함) |
| **vitest** | 5.0 | `src/lib` 순수 함수 테스트 |
| **exifr** | 7.1 | EXIF 파싱. HEIC 지원 |

### 왜 SSR(framework mode)이 아닌가

- 로그인 후 쓰는 **개인 기록 앱** → SEO 불필요
- 정적 호스팅이라 **배포가 단순하고 비용 0**
- SSR은 서버 인프라 + 인증 복잡도(쿠키/세션 하이드레이션)를 추가한다

랜딩 페이지 SEO만 필요해지면 그것만 정적 프리렌더하면 된다.

### 왜 axios를 안 쓰는가

원래 계획에 axios가 있었으나 제외했다.

- `supabase-js`는 내부적으로 `fetch` 기반 → axios가 낄 자리가 없다
- Edge Function 호출도 `supabase.functions.invoke()`가 JWT를 자동으로 붙인다
- axios를 넣으면 "인터셉터로 토큰 갱신하는 레이어"를 또 만들게 되는데, Supabase가 이미 하는 일이다

→ **외부 서드파티 API(날씨 등)를 붙일 때 추가한다.** 지금은 불필요.

### React Router v8 — 검증 결과

`react-router@8.4.0` 설치 후 **실제 export를 확인했다.**

```
createBrowserRouter  function
RouterProvider       function
Outlet               function
NavLink              object
Link                 object
useNavigate          function
useParams            function
Navigate             function
```

declarative mode에서 쓰는 API가 v6.4 이후와 **동일하다.**
현재 셸(`src/routes/index.tsx`)이 이 API로 동작하며 빌드·구동 모두 확인됐다.

단, v7 → v8의 **전체** 변경점을 훑은 것은 아니다.
loader/action, lazy route, `data` API 등 지금 쓰지 않는 기능을 나중에 도입할 때는
공식 마이그레이션 가이드를 확인할 것.

---

## 쿼리 키 전략

무효화 실수를 막기 위해 키를 팩토리로 관리한다.

```ts
// src/api/keys.ts
export const qk = {
  plants: {
    all:     ['plants'] as const,
    list:    (filter?: string) => ['plants', 'list', filter ?? 'all'] as const,
    detail:  (id: string)      => ['plants', 'detail', id] as const,
  },
  entries: {
    all:     ['entries'] as const,
    byPlant: (plantId: string) => ['entries', 'plant', plantId] as const,
    detail:  (id: string)      => ['entries', 'detail', id] as const,
  },
  ai: {
    byEntry: (entryId: string) => ['ai', 'entry', entryId] as const,
    quota:   ['ai', 'quota'] as const,
  },
} as const;
```

일지를 추가하면 `qk.entries.byPlant(plantId)`와 `qk.plants.detail(plantId)`를 함께 무효화한다
(식물 카드의 최근 사진·물주기 상태가 바뀌므로).
