import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

interface AuthShellProps {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export default function AuthShell({ eyebrow, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative isolate flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0A0A0F] px-4 py-12">
      {/* 배경 레이어 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#222_0.8px,transparent_1px)] bg-[length:4px_4px] opacity-40" />

        {/* Animated Blobs */}
        <div className="auth-blob absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,#22d3ee_0%,transparent_70%)] mix-blend-screen blur-3xl" style={{ animation: 'auth-blob-a 22s ease-in-out infinite' }} />
        <div className="auth-blob absolute -right-32 top-1/3 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,#a855f7_0%,transparent_70%)] mix-blend-screen blur-3xl" style={{ animation: 'auth-blob-b 26s ease-in-out infinite' }} />
        <div className="auth-blob absolute -bottom-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,#ec4899_0%,transparent_70%)] mix-blend-screen blur-3xl" style={{ animation: 'auth-blob-c 30s ease-in-out infinite' }} />
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
        <div className="mb-8 flex justify-center">
          <Link to="/" className="flex items-center gap-2 text-sm tracking-[3px] text-white/70 hover:text-white transition-colors">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
            PHONARA
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-9 backdrop-blur-3xl shadow-2xl shadow-black/60">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {eyebrow && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1 text-[11px] tracking-[1.5px] text-white/60">
              {eyebrow}
            </div>
          )}

          <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-white mb-2">{title}</h1>
          {subtitle && <p className="text-white/60 text-[15px] mb-8">{subtitle}</p>}

          <div>{children}</div>

          {footer && <div className="mt-8 text-center text-sm text-white/50">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
