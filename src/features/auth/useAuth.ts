/**
 * useAuth.ts
 *
 * React에서 인증 상태를 쉽게 사용할 수 있도록 제공하는 커스텀 훅입니다.
 *
 * 설계 원칙:
 * - 인증 상태를 중앙에서 관리
 * - Supabase의 onAuthStateChange를 활용해 실시간 동기화
 * - 로딩 상태를 명확하게 관리
 * - 컴포넌트에서 인증 관련 작업을 간편하게 수행할 수 있게 함
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthUser, AuthSession } from "./auth.types";
import { getCurrentSession, signIn, signOut, signUp } from "./auth.ts";

interface UseAuthReturn {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 초기 세션 로드
    const loadInitialSession = async () => {
      const currentSession = await getCurrentSession();
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      }
      setIsLoading(false);
    };

    loadInitialSession();

    // 인증 상태 변화 구독
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession?.user) {
          const mappedUser = {
            id: newSession.user.id,
            email: newSession.user.email ?? null,
          };
          setUser(mappedUser);
          setSession({
            user: mappedUser,
            accessToken: newSession.access_token,
            expiresAt: newSession.expires_at,
          });
        } else {
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await signIn({ email, password });
    setIsLoading(false);

    if (error) {
      throw new Error(error.message);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await signUp({ email, password });
    setIsLoading(false);

    if (error) {
      throw new Error(error.message);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    const { error } = await signOut();
    setIsLoading(false);

    if (error) {
      throw new Error(error.message);
    }

    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
}
