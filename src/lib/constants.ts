/** 브랜드 문자열은 여기 한 곳에만 둔다. 이름을 바꿀 때 이 파일만 고치면 된다. */
export const BRAND = {
  nameKo: '그루',
  nameEn: 'Groo',
  /** 로고에 쓰는 표기 */
  wordmark: 'Groo',
  tagline: '오늘도 잘 자라는 중',
  storeTitle: '그루 - 식물 성장 일기',
} as const;

/** 활동 태그 — DB의 care_action enum 과 1:1 대응. 사용자 커스텀 불가. */
export const CARE_ACTIONS = [
  { value: 'water', emoji: '💧', label: '물주기' },
  { value: 'repot', emoji: '🪴', label: '분갈이' },
  { value: 'fertilize', emoji: '🌿', label: '비료' },
  { value: 'prune', emoji: '✂️', label: '가지치기' },
  { value: 'move', emoji: '☀️', label: '자리이동' },
  { value: 'observe', emoji: '👀', label: '관찰만' },
  { value: 'other', emoji: '✍️', label: '기타' },
] as const;

export type CareAction = (typeof CARE_ACTIONS)[number]['value'];

export const PHOTO = {
  /** 리사이즈 후 긴 변 최대 픽셀 */
  maxEdge: 1600,
  /** WebP 인코딩 품질 */
  quality: 0.82,
  /** 원본 파일 최대 크기 (bytes) */
  maxBytes: 10 * 1024 * 1024,
  /** 일지당 최대 장수. 장당 200~400KB 라 10장이어도 무료 1GB 안에서 넉넉하다. */
  maxPerEntry: 10,
  /** HEIC 를 제외해야 iOS Safari 가 자동으로 JPEG 로 변환해준다 */
  accept: 'image/jpeg,image/png,image/webp',
} as const;

export const AI = {
  /** 유저당 일일 무료 횟수 */
  dailyQuota: 5,
  /** 결과 폴링 간격 (ms) */
  pollIntervalMs: 3000,
  /** 폴링 최대 횟수 (3s × 20 = 60s) */
  pollMaxAttempts: 20,
  disclaimer:
    'AI가 사진만 보고 추정한 참고 의견이에요. 실제 상태와 다를 수 있으니 직접 확인해주세요.',
} as const;
