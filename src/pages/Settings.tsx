import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { signOut, updateProfile } from '../api/auth';
import { qk } from '../api/keys';
import { cn } from '../lib/cn';
import { useProfile, useUserId } from '../hooks/useSession';
import { useUiStore, type ThemeMode } from '../stores/uiStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import type { Profile } from '../types/models';

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

      {userId && <ProfileCard userId={userId} profile={profile ?? null} />}

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

/** 이름은 저장 버튼을 눌러야 바뀐다. 입력만 해도 저장되면 저장됐는지 알 수 없다. */
function ProfileCard({ userId, profile }: { userId: string; profile: Profile | null }) {
  const qc = useQueryClient();
  // 프로필을 다시 받아오기 전에도 바로 "저장했어요" 가 뜨도록 저장한 값을 따로 들고 있는다
  const [saved, setSaved] = useState(profile?.display_name ?? '');
  const [name, setName] = useState(saved);
  const save = useMutation({
    mutationFn: (displayName: string) =>
      updateProfile(userId, { display_name: displayName }),
    onSuccess: (_data, displayName) => {
      setSaved(displayName);
      setName(displayName);
      void qc.invalidateQueries({ queryKey: qk.profile });
      // 커뮤니티 글·댓글의 작성자 이름도 바뀐다
      void qc.invalidateQueries({ queryKey: qk.posts });
      void qc.invalidateQueries({ queryKey: qk.author(userId) });
    },
  });

  const trimmed = name.trim();
  const dirty = trimmed !== saved;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">프로필</h2>
      <Field
        label="이름"
        hint={
          save.isSuccess && !dirty ? (
            <span className="text-leaf-600">저장했어요</span>
          ) : (
            '커뮤니티에 이 이름으로 보여요'
          )
        }
        error={save.isError ? '저장하지 못했어요. 다시 시도해주세요.' : undefined}
      >
        <div className="flex gap-2">
          <Input
            value={name}
            maxLength={20}
            onChange={(e) => {
              setName(e.currentTarget.value);
              save.reset();
            }}
          />
          <Button
            className="shrink-0"
            disabled={!dirty || trimmed === '' || save.isPending}
            onClick={() => save.mutate(trimmed)}
          >
            {save.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </Field>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        타임존: {profile?.timezone ?? 'Asia/Seoul'} — EXIF 촬영시각을 해석하는 기준이에요
      </p>
    </Card>
  );
}
