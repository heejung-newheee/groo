/**
 * 쿼리 키 팩토리. 무효화 실수를 막으려고 한 곳에 모은다.
 * 문자열을 컴포넌트에 흩뿌리면 invalidate 대상이 어긋난다.
 */
export const qk = {
  session: ['session'] as const,
  profile: ['profile'] as const,

  plants: ['plants'] as const,
  plant: (id: string) => ['plants', id] as const,

  entries: ['entries'] as const,
  entriesByPlant: (plantId: string) => ['entries', 'plant', plantId] as const,
  entriesByMonth: (month: string) => ['entries', 'month', month] as const,
  entriesRecent: ['entries', 'recent'] as const,
  entry: (id: string) => ['entries', 'detail', id] as const,

  analysis: (photoId: string) => ['ai', 'analysis', photoId] as const,
  aiQuota: ['ai', 'quota'] as const,

  signedUrls: (paths: string[]) => ['storage', ...paths] as const,
} as const;
