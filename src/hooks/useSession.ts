import { useQuery } from '@tanstack/react-query';
import { fetchProfile, getSession } from '../api/auth';
import { qk } from '../api/keys';

export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: getSession,
    staleTime: Infinity,
  });
}

/** 로그인한 사용자 id. 비로그인이면 null. */
export function useUserId(): string | null {
  const { data } = useSession();
  return data?.user.id ?? null;
}

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.profile,
    queryFn: () => fetchProfile(userId as string),
    enabled: userId !== null,
  });
}
