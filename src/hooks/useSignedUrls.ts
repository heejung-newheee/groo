import { useQuery } from '@tanstack/react-query';
import { qk } from '../api/keys';
import { signedUrls } from '../api/storage';

/**
 * 버킷이 private 이라 매번 서명 URL 이 필요하다.
 * 목록에서 장당 요청하면 N+1 이 되므로 경로를 모아 한 번에 서명한다.
 * TTL 1시간보다 짧게 캐시해 만료 전에 갱신한다.
 */
export function useSignedUrls(paths: (string | null)[]) {
  const clean = paths.filter((p): p is string => typeof p === 'string' && p.length > 0).sort();

  return useQuery({
    queryKey: qk.signedUrls(clean),
    queryFn: () => signedUrls(clean),
    enabled: clean.length > 0,
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  });
}
