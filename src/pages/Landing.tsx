import { Sprout } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { BRAND } from '../lib/constants';
import { useSession } from '../hooks/useSession';

export function Landing() {
  const { data: session, isPending } = useSession();

  if (isPending) return null;
  if (session) return <Navigate to="/home" replace />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Sprout className="size-16 text-leaf-500" aria-hidden />
      <div>
        <h1 className="text-3xl font-bold">{BRAND.nameKo}</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          {BRAND.tagline}
        </p>
      </div>
      <p className="text-[15px] leading-relaxed">
        식물의 성장을 사진으로 기록하세요.
        <br />
        사진을 올리면 촬영일시를 자동으로 가져오고,
        <br />
        AI에게 상태를 물어볼 수 있어요.
      </p>
      <div className="flex w-full flex-col gap-2">
        <Link
          to="/signup"
          className="flex min-h-[48px] items-center justify-center rounded-input bg-leaf-500 px-4 font-semibold text-white"
        >
          시작하기
        </Link>
        <Link
          to="/login"
          className="flex min-h-[48px] items-center justify-center rounded-input border px-4 font-medium"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          이미 계정이 있어요
        </Link>
      </div>
    </main>
  );
}
