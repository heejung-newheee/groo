# 09. 보안 · 안전성 체크리스트

## 🔴 반드시 (하나라도 빠지면 배포 금지)

### 인증 / 권한

- [ ] **모든 테이블 RLS 활성화**
      `enable row level security`가 빠진 테이블 하나가 전체 DB 유출 경로가 된다.
      Supabase 대시보드 → Advisors → Security 를 배포 전마다 확인.
- [ ] **RLS 정책은 `(select auth.uid())` 형태로 작성**
      성능(인덱스 사용)과 정확성 양쪽 이유.
- [ ] **Edge Function `verify_jwt = true`**
      + 함수 내부에서 `entryId`/`photoId`가 정말 그 유저 것인지 **재확인**.
      JWT가 유효해도 파라미터는 조작할 수 있다.
- [ ] **Auth redirect URL 화이트리스트** 설정 (오픈 리다이렉트 방지)

### 시크릿

- [ ] **`SERVICE_ROLE_KEY`를 절대 클라이언트 번들에 넣지 않는다**
      `VITE_` 접두사 환경변수는 **전부 공개된다.**
      - `VITE_SUPABASE_ANON_KEY` → 공개돼도 안전 (RLS가 막음)
      - `SUPABASE_SERVICE_ROLE_KEY` → RLS를 우회하므로 노출되면 끝
- [ ] **`ANTHROPIC_API_KEY`는 Edge Function secret에만**
      ```bash
      npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
      ```
- [ ] **`.env.local`이 `.gitignore`에 있는지 확인**
- [ ] 빌드 후 번들에서 시크릿 검색:
      ```bash
      npm run build && grep -rE "(service_role|sk-ant-|eyJ.*role.*service)" dist/ || echo "OK"
      ```

### 개인정보

- [ ] **EXIF GPS 스트립**
      집에서 찍은 식물 사진의 GPS = **집 주소**다.
      읽기는 하되 **절대 저장하지 않는다.** 리사이즈 과정에서 자동 제거되지만 검증할 것:
      ```bash
      npx exiftool uploaded.webp | grep -i gps   # 출력 없어야 통과
      ```
- [ ] **회원 탈퇴 시 Storage 파일까지 삭제**
      DB는 `on delete cascade`로 지워지지만 **Storage는 안 지워진다.**
      `delete-account` Edge Function에서 `{user_id}/` 폴더를 통째로 제거.
- [ ] 데이터 내보내기 기능 (JSON + 사진 zip) — 개인정보보호법 대응이자 신뢰 요소

### 업로드

- [ ] **Storage 버킷 `public = false`**
      public 버킷은 URL만 알면 누구나 접근한다.
- [ ] **경로 첫 세그먼트를 `user_id`로 강제** (Storage RLS)
- [ ] **업로드 검증을 양쪽에서**
      | 항목 | 클라이언트 | 버킷 설정 |
      |---|---|---|
      | MIME | ✅ | ✅ `allowed_mime_types` |
      | 크기 10MB | ✅ | ✅ `file_size_limit` |

      클라이언트 검증만으로는 우회 가능하다.

### AI

- [ ] **유저당 일일 쿼터** (없으면 스크립트 한 방에 비용 폭파)
- [ ] **전역 월 예산 상한**
- [ ] **Anthropic Console에서 조직 지출 한도 설정** — 앱 로직 버그에 대한 최후 방어선
- [ ] `ai_analyses`에 클라이언트 **INSERT 정책을 만들지 않는다** → 결과 위조 차단

---

## 🟡 권장

- [ ] Signed URL TTL을 짧게 (상세 1시간, 다운로드 5분)
- [ ] CSP 헤더 — `default-src 'self'` + Supabase 도메인만 허용
- [ ] `security definer` 함수에 **반드시 `set search_path = ''`**
      (빠뜨리면 search_path 조작을 통한 권한 상승 경로가 열린다)
- [ ] Sentry 연동 + Supabase 로그 모니터링
- [ ] Dependabot / Renovate 설정
- [ ] `npm audit` 를 CI에 포함
- [ ] Rate limiting — 일지 생성도 분당 상한 (스팸 방지)

---

## 🟢 UX 차원의 안전성

- [ ] **AI 면책 문구 상시 노출** (접는 UI로 숨기지 않기)
- [ ] `severity: 'urgent'` 남발 금지 — 프롬프트에서 명시적으로 제한
- [ ] 사진/일지 삭제 시 확인 다이얼로그 — 추억 데이터는 복구 불가
- [ ] 식물 삭제는 **soft delete** (`archived_at`) — 실수 방지 + 정서적으로도 맞음
- [ ] 업로드 실패 시 조용히 버리지 않고 재시도 큐 + 명시적 알림
- [ ] AI 실패 시 쿼터 차감하지 않기

---

## 환경변수 정리

### 클라이언트 (`.env.local`) — 공개됨

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...    # 공개돼도 안전 (RLS가 막음)
```

### Edge Function secrets — 절대 비공개

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set AI_MODEL=claude-opus-5
npx supabase secrets set AI_DAILY_QUOTA=5
npx supabase secrets set AI_MONTHLY_CALL_CAP=20000
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 자동 주입
```

---

## 배포 전 최종 점검 스크립트

```bash
#!/usr/bin/env bash
set -e

echo "1. 번들에 시크릿이 있는가"
npm run build
if grep -rqE "(service_role|sk-ant-)" dist/; then
  echo "❌ 시크릿 노출"; exit 1
fi
echo "✅ OK"

echo "2. 타입 체크"
npx tsc --noEmit
echo "✅ OK"

echo "3. 린트"
npx oxlint
echo "✅ OK"

echo "4. 테스트"
npx vitest run
echo "✅ OK"

echo ""
echo "수동 확인 항목:"
echo "  □ Supabase Advisors → Security 경고 0건"
echo "  □ 모든 테이블 RLS 활성화"
echo "  □ Storage 버킷 public=false"
echo "  □ 다른 계정 토큰으로 내 데이터 조회 시도 → 차단 확인"
echo "  □ 업로드된 이미지에 GPS 없음 (exiftool)"
echo "  □ Anthropic Console 지출 한도 설정됨"
```

---

## 침투 테스트 시나리오 (W1, W3, W4에서 각각 실행)

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | 계정 A 토큰으로 계정 B의 `plants` 조회 | 빈 배열 (에러 아님 — RLS는 조용히 필터) |
| 2 | 계정 A 토큰으로 계정 B의 `plant_id`에 일지 생성 | `insert` 실패 |
| 3 | `{other_user_id}/...` 경로로 Storage 업로드 | 403 |
| 4 | 남의 사진 `storage_path`로 signed URL 요청 | 실패 |
| 5 | `ai_analyses`에 직접 INSERT 시도 | 정책 없음 → 실패 |
| 6 | 남의 `entryId`로 `analyze-plant` 호출 | 403, DB 변화 없음 |
| 7 | 쿼터 소진 후 6번째 호출 | `skipped`, Claude API 호출 0회 |
| 8 | 12MB 파일 업로드 | 클라이언트에서 거부, 우회해도 버킷에서 거부 |
