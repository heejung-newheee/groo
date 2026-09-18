import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { signOut, updateProfile } from '../api/auth';
import { cn } from '../lib/cn';
import { useProfile, useUserId } from '../hooks/useSession';
import { useUiStore, type ThemeMode } from '../stores/uiStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = useUserId();
  const { data: profile, isPending } = useProfile();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  if (isPending) return <Skeleton className="h-64 w-full" />;

  async function handleSignOut() {
    await signOut();
    qc.clear();
    void navigate('/', { replace: true });
  }

  function handleThemeChange(next: ThemeMode) {
    setTheme(next);
    // 기기 간 동기화를 위해 서버에도 남긴다. 실패해도 로컬 설정은 유지된다.
    if (userId) void updateProfile(userId, { theme: next }).catch(() => {});
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-bold">설정</h1>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">프로필</h2>
        <Field label="이름">
          <Input
            defaultValue={profile?.display_name ?? ''}
            onBlur={(e) => {
              if (userId) void updateProfile(userId, { display_name: e.currentTarget.value });
            }}
          />
        </Field>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          타임존: {profile?.timezone ?? 'Asia/Seoul'} — EXIF 촬영시각을 해석하는 기준이에요
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">테마</h2>
        <div className="flex gap-2">
          {THEMES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => handleThemeChange(value)}
              className={cn(
                'min-h-[44px] flex-1 rounded-input border text-sm font-medium',
                theme === value ? 'border-leaf-500 bg-leaf-100 text-leaf-700' : '',
              )}
              style={theme === value ? undefined : { borderColor: 'var(--border-subtle)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Button variant="secondary" onClick={() => void handleSignOut()}>
        로그아웃
      </Button>
    </div>
  );
}
