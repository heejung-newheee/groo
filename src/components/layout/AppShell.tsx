import { Calendar, House, PenLine, Settings, Sprout } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { BRAND } from '../../lib/constants';
import { cn } from '../../lib/cn';

const NAV = [
  { to: '/home', label: '홈', Icon: House },
  { to: '/calendar', label: '캘린더', Icon: Calendar },
  { to: '/plants', label: '내 식물', Icon: Sprout },
  { to: '/settings', label: '설정', Icon: Settings },
] as const;

/**
 * 반응형 셸.
 *   < 768px  : 하단 탭 + FAB
 *   ≥ 768px  : 좌측 사이드바
 */
export function AppShell() {
  return (
    <div className="min-h-dvh md:flex">
      {/* ── 데스크톱/태블릿 사이드바 ── */}
      <aside
        className="hidden w-60 shrink-0 flex-col gap-1 border-r p-4 md:flex"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <Sprout className="size-6 text-leaf-500" aria-hidden />
          <span className="text-lg font-bold">{BRAND.nameKo}</span>
        </div>

        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-leaf-100 text-leaf-700' : 'hover:bg-leaf-50',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}

        <NavLink
          to="/entries/new"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-leaf-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-leaf-600"
        >
          <PenLine className="size-4" aria-hidden />새 일지
        </NavLink>
      </aside>

      {/* ── 본문 ── */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-[1200px] px-4 py-5 md:px-6">
          <Outlet />
        </div>
      </main>

      {/* ── 모바일 FAB ── */}
      <NavLink
        to="/entries/new"
        aria-label="새 일지 쓰기"
        className="fixed right-4 bottom-20 flex size-14 items-center justify-center rounded-full bg-leaf-500 text-white shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <PenLine className="size-6" aria-hidden />
      </NavLink>

      {/* ── 모바일 하단 탭 ── */}
      <nav
        className="fixed inset-x-0 bottom-0 flex border-t md:hidden"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                isActive ? 'text-leaf-600' : 'text-[var(--text-muted)]',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
