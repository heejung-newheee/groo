# 04. 디자인 시스템

## 디자인 원칙 5가지

1. **사진이 주인공** — 카드에서 이미지가 70% 이상. 텍스트는 보조.
2. **D+일수를 항상 노출** — "182일째 함께"가 애착의 핵심 지표.
3. **입력은 3탭 안에** — 사진 → 태그 → 저장. 메모는 선택.
4. **다크모드 필수** — 식물 사진은 어두운 배경에서 훨씬 예쁘다.
5. **호들갑 떨지 않는다** — AI 경고도, 알림도 차분하게. 불안을 팔지 않는다.

---

## 컬러 토큰

Tailwind v4는 CSS-first다. `src/index.css`의 `@theme` 블록에 정의한다.

```css
@theme {
  /* Primary — 잎 초록 */
  --color-leaf-50:  #F1F7F2;
  --color-leaf-100: #DCEBE0;
  --color-leaf-300: #8CBB98;
  --color-leaf-500: #4A8B5C;   /* 기본 */
  --color-leaf-600: #3A7049;
  --color-leaf-700: #2C5537;

  /* Accent — 흙 갈색 */
  --color-soil-300: #C4AC8A;
  --color-soil-500: #8B6F47;
  --color-soil-700: #5E4A2E;

  /* Special — 개화/이벤트 */
  --color-bloom-400: #E8A0BF;

  /* Semantic */
  --color-warn-500:   #D97706;   /* AI 주의 */
  --color-urgent-500: #DC2626;   /* AI 급함 */
  --color-ok-500:     #4A8B5C;   /* AI 건강 = leaf */

  /* Neutral */
  --color-cream-50:  #FBF9F4;   /* Light 배경 */
  --color-cream-100: #F4F1E9;
  --color-bark-700:  #3F3A35;
  --color-bark-800:  #2A2622;
  --color-bark-900:  #1C1917;   /* Dark 배경 */

  /* Radius */
  --radius-card:  16px;
  --radius-chip:  999px;
  --radius-input: 12px;
}
```

### 라이트/다크 매핑

의미 기반 변수를 한 겹 더 두고 컴포넌트는 이것만 쓴다.
색을 직접 참조하면 다크모드에서 전부 깨진다.

```css
:root {
  --bg-base:      var(--color-cream-50);
  --bg-surface:   #FFFFFF;
  --bg-elevated:  #FFFFFF;
  --text-primary: var(--color-bark-900);
  --text-muted:   #6B6560;
  --border-subtle: #E5E0D8;
}

:root:not([data-theme="light"]) {
  @media (prefers-color-scheme: dark) {
    --bg-base:      var(--color-bark-900);
    --bg-surface:   var(--color-bark-800);
    --bg-elevated:  var(--color-bark-700);
    --text-primary: #F4F1E9;
    --text-muted:   #A8A099;
    --border-subtle: #3F3A35;
  }
}

:root[data-theme="dark"] {
  --bg-base:      var(--color-bark-900);
  --bg-surface:   var(--color-bark-800);
  --bg-elevated:  var(--color-bark-700);
  --text-primary: #F4F1E9;
  --text-muted:   #A8A099;
  --border-subtle: #3F3A35;
}
```

**테마 전환은 3-state**: `system`(기본) / `light` / `dark`.
`data-theme` 속성을 `<html>`에 붙이고, `system`일 때는 속성을 제거한다.

---

## 타이포그래피

```css
@theme {
  --font-sans: 'Pretendard Variable', Pretendard, -apple-system,
               BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, monospace;
}
```

| 역할 | 크기 / 굵기 / 자간 | 용도 |
|---|---|---|
| `display` | 28px / 700 / -0.02em | 식물 애칭 (상세 화면) |
| `title` | 20px / 600 / -0.01em | 섹션 헤더 |
| `body` | 15px / 400 / 0 | 본문, 메모 |
| `label` | 13px / 500 / 0 | 칩, 버튼, 폼 라벨 |
| `caption` | 12px / 400 / 0 | 날짜, 보조 설명, 면책 문구 |
| `dday` | 14px / 700 / 0.02em | D+182 (탭룰러 숫자) |

- 본문 `line-height: 1.6`, 제목 `1.3`
- **Pretendard는 CDN이 아니라 self-host** (`public/fonts/`). 외부 CDN 의존은 오프라인/PWA에서 깨진다.
- 숫자에는 `font-variant-numeric: tabular-nums` (D-day가 흔들리지 않게)

---

## 간격 / 레이아웃

```
기본 단위: 4px
간격 스케일: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

모바일 좌우 거터: 16px
태블릿 좌우 거터: 24px
데스크톱 콘텐츠 최대폭: 1200px
카드 간 간격: 12px (모바일) / 16px (그 이상)
```

---

## 핵심 컴포넌트 규격

### PlantCard

```
┌─────────────────┐
│                 │  이미지 영역: aspect-ratio 1/1
│     [사진]       │  object-fit: cover
│                 │  radius: 16px 16px 0 0
├─────────────────┤
│ 몬스테라          │  title (1줄 truncate)
│ D+182           │  dday, leaf-600
│ 💧 D-2          │  label, 물주기 임박 시 warn-500
└─────────────────┘
```

- 물주기 당일/초과: 좌상단에 `💧` 배지 (warn-500)
- 이미지 없음: `leaf-100` 배경 + 식물 아이콘 플레이스홀더
- 로딩: 스켈레톤(펄스 없이 `bg-subtle` 정적 — 펄스는 피로감)

### ActionChip (활동 태그)

```
미선택:  border 1px solid var(--border-subtle), bg transparent
선택:    bg leaf-100, border leaf-500, text leaf-700
크기:    height 40px, padding 0 14px, radius 999px
내용:    이모지 + 한글 라벨 (이모지 단독 금지)
```

### TimelineItem

```
 ●───  날짜 + 활동 태그
 │     ┌──────────────┐
 │     │   [썸네일]    │   16:9, radius 12px
 │     └──────────────┘
 │     메모 (2줄 truncate)
 │     🤖 AI 배지 (있을 때만)
 │
 ●───  다음 항목
```

세로선은 `border-subtle` 1px, 노드는 `leaf-500` 8px 원.

### AiDiagnosisCard

```
radius: 16px
border: 1px solid — severity 최대값에 따라 색 변경
        healthy → border-subtle
        watch   → warn-500 (20% opacity)
        needs_attention → urgent-500 (20% opacity)
배경:   bg-surface
하단:   면책 문구 영역은 bg-base로 구분 + caption 크기
```

---

## 모션

| 대상 | 값 |
|---|---|
| 페이지 전환 | 120ms `ease-out`, opacity만 (position 이동 금지 — 모바일에서 어지러움) |
| 카드 탭 | `scale(0.97)`, 80ms |
| 시트/모달 | 240ms `cubic-bezier(0.32, 0.72, 0, 1)` |
| 스켈레톤 | 애니메이션 없음 (정적 회색) |
| AI 결과 등장 | 200ms fade + 8px 상승 |

`prefers-reduced-motion: reduce` 시 **전부 0ms**로.

---

## 아이콘

`lucide-react` 사용. 활동 태그만 이모지(시각적 친근함), 나머지 UI는 전부 lucide.

| 용도 | 아이콘 |
|---|---|
| 홈 | `House` |
| 캘린더 | `Calendar` |
| 내 식물 | `Sprout` |
| 설정 | `Settings` |
| 일지 작성 | `PenLine` |
| AI | `Sparkles` |
| 물주기 | `Droplet` |

---

## 파비콘 / 앱 아이콘

- 심볼: 화분에서 잎 2장이 올라오는 형태 (나무 아님 — 네이밍 이슈와 일관)
- 배경: `leaf-500`, 심볼: `cream-50`
- 필요 사이즈: 192 / 512 (PWA), 180 (apple-touch-icon), 32 / 16 (favicon)
