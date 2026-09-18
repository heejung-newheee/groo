import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { qk } from './api/keys';
import { supabase } from './lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 사진/일지는 자주 바뀌지 않는다. 불필요한 재요청을 줄인다.
      staleTime: 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * 로그인/로그아웃/토큰 갱신을 Query 캐시에 반영한다.
 * 이걸 빼면 로그인 후에도 세션 쿼리가 낡은 값을 들고 있어 가드가 계속 막는다.
 */
function AuthSync({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(qk.session, session);
      if (!session) queryClient.removeQueries({ queryKey: qk.profile });
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 첫 세션 복원 전에 그리면 로그인 화면이 한 번 깜빡인다.
  return ready ? children : null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync>{children}</AuthSync>
    </QueryClientProvider>
  );
}
