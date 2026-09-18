import type { Provider, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/models';

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 트리거가 이 값을 읽어 profiles.display_name 을 채운다
      data: { name: displayName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;

  // 이메일 확인이 켜져 있으면 가입 직후 세션이 없다
  return { needsConfirmation: data.session === null };
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** OAuth 는 아직 대시보드 설정 전이다. 제공자를 켜면 그대로 쓸 수 있다. */
export async function signInWith(provider: Provider): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'display_name' | 'timezone' | 'theme'>>,
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

/** Supabase 가 돌려주는 영문 메시지를 사용자에게 보여줄 문구로 바꾼다. */
export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요';
  if (message.includes('Email not confirmed')) return '메일함에서 인증 링크를 먼저 눌러주세요';
  if (message.includes('User already registered')) return '이미 가입된 이메일이에요';
  if (message.includes('rate limit') || message.includes('Too many'))
    return '잠시 후 다시 시도해주세요';
  if (message.includes('Password should be')) return '비밀번호는 6자 이상이어야 해요';

  return '문제가 생겼어요. 잠시 후 다시 시도해주세요';
}
