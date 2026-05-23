/**
 * _authenticated.tsx
 *
 * 로그인한 사용자만 접근할 수 있는 페이지를 위한 레이아웃입니다.
 *
 * 사용법:
 * src/routes/_authenticated/my-page.tsx 처럼 _authenticated 폴더 안에 페이지를 만들면
 * 자동으로 인증 체크가 적용됩니다.
 *
 * 현재는 로그인되지 않은 경우 홈(/)으로 리다이렉트합니다.
 * 추후 로그인 페이지가 생기면 해당 경로로 변경 예정입니다.
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/features/auth/useAuth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // 로딩 중일 때는 아무것도 렌더링하지 않음 (또는 로딩 스피너)
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  // 인증되지 않은 경우 홈으로 리다이렉트
  if (!isAuthenticated) {
    // TODO: 로그인 페이지가 생기면 '/login'으로 변경
    throw redirect({ to: "/" });
  }

  return <Outlet />;
}
