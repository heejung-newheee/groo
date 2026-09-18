import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../hooks/useSession';

/**
 * 세션 확인 전에는 아무것도 그리지 않는다.
 * 로딩 중에 리다이렉트하면 새로고침할 때마다 로그인 화면이 깜빡인다.
 */
export function RequireAuth() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}
