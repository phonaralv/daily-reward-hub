/**
 * auth.types.ts
 *
 * 인증 도메인에서 사용하는 핵심 타입을 정의합니다.
 * 이 파일은 Supabase와의 결합도를 낮추고, 타입 안정성을 높이기 위해 존재합니다.
 *
 * 설계 원칙:
 * - Supabase의 내부 타입을 직접 노출하지 않음
 * - 필요한 최소한의 정보만 노출
 * - 향후 다른 인증 제공자(예: Clerk, Auth0)로 전환하기 쉽도록 설계
 */

export interface AuthUser {
  id: string;
  email: string | null;
  createdAt?: string;
  lastSignInAt?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  expiresAt?: number;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'user_not_found'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'email_already_exists'
  | 'unknown';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

/** 인증 상태 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
