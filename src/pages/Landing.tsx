import { Link, Navigate } from 'react-router';
import { BRAND } from '../lib/constants';
import { useSession } from '../hooks/useSession';
import { OnboardingSlides } from '../components/onboarding/OnboardingSlides';
import { Logo } from '../components/ui/Logo';

export function Landing() {
  const { data: session, isPending } = useSession();

  if (isPending) return null;
  if (session) return <Navigate to="/home" replace />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1>
          <Logo vertical markClassName="size-14" wordClassName="text-4xl" />
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {BRAND.tagline}
        </p>
      </header>

      <OnboardingSlides />

      {/* 시작 버튼은 슬라이드를 다 안 봐도 항상 닿을 수 있어야 한다 */}
      <div className="flex flex-col gap-2">
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
