import { zodResolver } from '@hookform/resolvers/zod';
import { Sprout } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router';
import { authErrorMessage, signInWithEmail } from '../api/auth';
import { BRAND } from '../lib/constants';
import { signInSchema, type SignInValues } from '../lib/schemas/auth';
import { useSession } from '../hooks/useSession';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

export function Login() {
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  if (isPending) return null;
  if (session) return <Navigate to="/home" replace />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-2">
        <Sprout className="size-12 text-leaf-500" aria-hidden />
        <h1 className="text-xl font-bold">{BRAND.nameKo} 로그인</h1>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void handleSubmit(async (values) => {
            setError(null);
            try {
              await signInWithEmail(values.email, values.password);
            } catch (err) {
              setError(authErrorMessage(err));
            }
          })(e);
        }}
      >
        <Field label="이메일" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        <Field label="비밀번호" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>

        {error && <p className="text-sm text-urgent-500">{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중…' : '로그인'}
        </Button>
      </form>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        아직 계정이 없으신가요?{' '}
        <Link to="/signup" className="font-medium text-leaf-600">
          가입하기
        </Link>
      </p>
    </main>
  );
}
