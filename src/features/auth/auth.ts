/**
 * auth.ts
 *
 * Supabase Auth를 감싸는 핵심 함수들을 제공합니다.
 * 이 파일의 목적은 Supabase와의 직접적인 결합을 최소화하고,
 * 일관된 인터페이스를 제공하는 것입니다.
 *
 * 설계 원칙:
 * - 모든 인증 관련 작업은 이 파일을 통해서만 수행
 * - Supabase 클라이언트는 내부에서만 사용
 * - 에러는 AuthError 타입으로 정규화
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  AuthUser,
  AuthSession,
  AuthError,
  SignInCredentials,
  SignUpCredentials,
} from "./auth.types";

function mapSupabaseUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
  };
}

export async function signUp(credentials: SignUpCredentials): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return {
      user: null,
      error: { code: "unknown", message: error.message },
    };
  }

  return {
    user: data.user ? mapSupabaseUser(data.user) : null,
    error: null,
  };
}

export async function signIn(credentials: SignInCredentials): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return {
      user: null,
      error: { code: "invalid_credentials", message: error.message },
    };
  }

  return {
    user: data.user ? mapSupabaseUser(data.user) : null,
    error: null,
  };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: { code: "unknown", message: error.message } };
  }

  return { error: null };
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const { data } = await supabase.auth.getSession();

  if (!data.session?.user) return null;

  return {
    user: mapSupabaseUser(data.session.user),
    accessToken: data.session.access_token,
    expiresAt: data.session.expires_at,
  };
}

/**
 * Magic Link 발송
 * 사용자에게 로그인용 링크를 이메일로 발송합니다.
 * 비밀번호 없이 이메일만으로 로그인 가능합니다.
 */
export async function sendMagicLink(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      error: { code: "unknown", message: error.message },
    };
  }

  return { error: null };
}
