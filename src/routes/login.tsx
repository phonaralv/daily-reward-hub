import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { sendMagicLink } from '@/features/auth/auth'
import AuthShell from '@/features/auth/ui/AuthShell'
import NeonInput from '@/features/auth/ui/NeonInput'
import NeonButton from '@/features/auth/ui/NeonButton'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setStatus('idle')

    const { error } = await sendMagicLink(email)

    if (error) {
      setStatus('error')
      setMessage(error.message || '오류가 발생했습니다. 다시 시도해주세요.')
    } else {
      setStatus('success')
      setMessage('Magic Link를 이메일로 발송했습니다. 메일함을 확인해주세요.')
    }
    setLoading(false)
  }

  return (
    <AuthShell
      eyebrow="LIVE • 지금 47,892명이 PHONARA에서 수익을 만들고 있습니다"
      title={
        <span className="bg-gradient-to-r from-white via-cyan-300 to-purple-400 bg-clip-text text-transparent">
          PHONARA
        </span>
      }
      subtitle="0초 진입, 3초 첫 보상. 진짜 부수입을 시작하세요."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <NeonInput
          type="email"
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <NeonButton type="submit" loading={loading} className="w-full h-14 text-lg font-semibold">
          Magic Link 받기
        </NeonButton>

        {status !== 'idle' && (
          <div className={`text-center py-3 text-sm rounded-2xl ${status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {message}
          </div>
        )}
      </form>

      <div className="mt-8 text-center text-sm text-white/50">
        처음이신가요?{' '}
        <Link to="/signup" className="text-white hover:text-cyan-400 font-medium transition-colors">
          회원가입
        </Link>
      </div>
    </AuthShell>
  )
}
