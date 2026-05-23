/**
 * AuthShell — premium dark-neon glassmorphism shell for auth pages.
 *
 * Layers:
 *  1) base dark canvas
 *  2) three animated radial blobs (cyan/purple/pink) via mix-blend-screen
 *  3) faded grid overlay
 *  4) glass card content
 *
 * Honors prefers-reduced-motion (CSS @media in styles.css disables blobs).
 * Mobile-safe area inset applied at outer container.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

interface AuthShellProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ eyebrow, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div
      className="relative isolate flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-background px-4 py-10"
      style={{
        paddingTop: "max(2.5rem, var(--safe-top))",
        paddingBottom: "max(2.5rem, var(--safe-bottom))",
        paddingLeft: "max(1rem, var(--safe-left))",
        paddingRight: "max(1rem, var(--safe-right))",
      }}
    >
      {/* Layer 2: animated blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="auth-blob absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full blur-3xl mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at center, var(--auth-glow-cyan), transparent 65%)",
            animation: "auth-blob-a 18s ease-in-out infinite",
          }}
        />
        <div
          className="auth-blob absolute -right-40 top-1/4 h-[600px] w-[600px] rounded-full blur-3xl mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at center, var(--auth-glow-purple), transparent 65%)",
            animation: "auth-blob-b 22s ease-in-out infinite",
          }}
        />
        <div
          className="auth-blob absolute -bottom-40 left-1/4 h-[480px] w-[480px] rounded-full blur-3xl mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at center, var(--auth-glow-pink), transparent 65%)",
            animation: "auth-blob-c 26s ease-in-out infinite",
          }}
        />
      </div>

      {/* Layer 3: grid */}
      <div
        aria-hidden
        className="auth-grid-overlay pointer-events-none absolute inset-0"
      />

      {/* Layer 4: content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-sm tracking-[0.3em] text-foreground/80 transition hover:text-foreground"
            aria-label="PHONARA 홈"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background: "var(--auth-glow-cyan)",
                boxShadow: "0 0 12px var(--auth-glow-cyan)",
              }}
            />
            PHONARA
          </Link>
        </div>

        <div
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-2xl sm:p-9"
          style={{ boxShadow: "var(--shadow-auth-card)" }}
        >
          {/* top edge highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.45), transparent)",
            }}
          />

          {eyebrow ? (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/70">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--auth-glow-gold)",
                  boxShadow: "0 0 8px var(--auth-glow-gold)",
                }}
              />
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}

          <div className="mt-7">{children}</div>
        </div>

        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
