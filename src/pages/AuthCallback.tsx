import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../hooks/useSession';

/**
 * OAuth 리다이렉트 착지점.
 * detectSessionInUrl 이 기본 true 라 supabase-js 가 URL 의 토큰을 알아서 처리한다.
 * 세션이 잡히면 홈으로 보낸다.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    void navigate(session ? '/home' : '/login', { replace: true });
  }, [session, isPending, navigate]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        로그인 중이에요…
      </p>
    </main>
  );
}
