/**
 * login.tsx
 *
 * Magic Link를 사용한 비밀번호 없는 로그인 페이지입니다.
 *
 * 흐름:
 * 1. 이메일 입력
 * 2. Magic Link 발송
 * 3. 이메일에서 링크 클릭 → 자동 로그인
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { sendMagicLink } from "@/features/auth/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await sendMagicLink(email);

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Magic Link를 이메일로 보냈습니다. 이메일을 확인해주세요."
        );
        setEmail("");
      }
    } catch (err) {
      setError("알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">PHONARA</h1>
          <p className="mt-2 text-zinc-400">Magic Link로 로그인하세요</p>
        </div>

        <form onSubmit={handleSendMagicLink} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              이메일 주소
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-800"
          >
            {isLoading ? "Magic Link 전송 중..." : "Magic Link 보내기"}
          </button>
        </form>

        <div className="text-center text-sm text-zinc-400">
          계정이 없으신가요?{" "}
          <a href="/signup" className="text-purple-400 hover:underline">
            회원가입
          </a>
        </div>
      </div>
    </div>
  );
}
