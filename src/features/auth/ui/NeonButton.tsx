import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ButtonState
  variant?: 'primary' | 'secondary'
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ state = 'idle', variant = 'primary', className, children, disabled, ...props }, ref) => {
    const isLoading = state === 'loading'
    const isSuccess = state === 'success'
    const isError = state === 'error'

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-4 text-lg font-semibold tracking-tight transition-all active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
          variant === 'primary' 
            ? "bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-white shadow-[0_10px_40px_-15px_rgb(168,85,247)]" 
            : "border border-white/20 bg-white/5 text-white hover:bg-white/10",
          isError && "animate-[auth-shake_0.4s_ease-in-out]",
          className
        )}
        {...props}
      >
        {isLoading && <span className="auth-shimmer absolute inset-0" />}
        
        <span className={cn("flex items-center gap-2 transition-all", (isLoading || isSuccess) && "opacity-90")}>
          {isLoading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : isSuccess ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7" />
            </svg>
          ) : null}
          {children}
        </span>
      </button>
    )
  }
)

NeonButton.displayName = 'NeonButton'
export default NeonButton

export { NeonButton };
