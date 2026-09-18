import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, Sprout } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router';
import { authErrorMessage, signUpWithEmail } from '../api/auth';
import { BRAND } from '../lib/constants';
import { signUpSchema, type SignUpValues } from '../lib/schemas/auth';
import { useSession } from '../hooks/useSession';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

export function Signup() {
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  if (isPending) return null;
  if (session) return <Navigate to="/home" replace />;

  // 이메일 확인이 켜져 있으면 가입 직후 세션이 없다. 안내하고 멈춘다.
  if (sentTo) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <MailCheck className="size-12 text-leaf-500" aria-hidden />
        <h1 className="text-xl font-bold">메일을 확인해주세요</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {sentTo} 으로 인증 링크를 보냈어요.
          <br />
          링크를 누르면 가입이 끝나요.
        </p>
        <Link to="/login" className="text-sm font-medium text-leaf-600">
          로그인으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-2">
        <Sprout className="size-12 text-leaf-500" aria-hidden />
        <h1 className="text-xl font-bold">{BRAND.nameKo} 시작하기</h1>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void handleSubmit(async (values) => {
            setError(null);
            try {
              const { needsConfirmation } = await signUpWithEmail(
                values.email,
                values.password,
                values.displayName,
              );
              // 확인이 꺼져 있으면 바로 세션이 생겨서 /home 으로 넘어간다
              if (needsConfirmation) setSentTo(values.email);
            } catch (err) {
              setError(authErrorMessage(err));
            }
          })(e);
        }}
      >
        <Field label="이름" error={errors.displayName?.message}>
          <Input autoComplete="name" placeholder="희정" {...register('displayName')} />
        </Field>

        <Field label="이메일" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        <Field label="비밀번호" error={errors.password?.message} hint="6자 이상">
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>

        {error && <p className="text-sm text-urgent-500">{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '가입 중…' : '가입하기'}
        </Button>
      </form>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-medium text-leaf-600">
          로그인
        </Link>
      </p>
    </main>
  );
}
