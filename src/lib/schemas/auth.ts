import { z } from 'zod';

/** Supabase 의 기본 최소 길이가 6자다. 여기서 막아야 서버 왕복 없이 바로 알려줄 수 있다. */
const password = z.string().min(6, '비밀번호는 6자 이상이어야 해요');

export const signInSchema = z.object({
  email: z.string().trim().email('이메일 형식을 확인해주세요'),
  password,
});

export const signUpSchema = z.object({
  email: z.string().trim().email('이메일 형식을 확인해주세요'),
  password,
  /** handle_new_user() 트리거가 raw_user_meta_data.name 을 읽어 profiles 에 넣는다. */
  displayName: z.string().trim().min(1, '이름을 입력해주세요').max(30, '30자 이내로 입력해주세요'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
