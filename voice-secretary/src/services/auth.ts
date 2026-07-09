import { supabase } from './supabase';

type AuthSignupResponse = {
  session?: {
    access_token: string;
    refresh_token: string;
  };
  user?: unknown;
  error?: string;
};

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.functions.invoke<AuthSignupResponse>('auth-signup', {
    body: { email, password },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.session) {
    throw new Error('가입은 완료됐지만 로그인 세션을 만들지 못했습니다.');
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (sessionError) {
    throw sessionError;
  }
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('로그인 세션을 만들 수 없습니다.');
  }
}
