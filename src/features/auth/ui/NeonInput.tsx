import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface NeonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          className={cn(
            "peer w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white placeholder-transparent outline-none transition-all focus:border-white/30 focus:bg-white/[0.05] autofill:shadow-[inset_0_0_0px_1000px_rgb(20,20,28)] autofill:text-white",
            error && "border-red-500/50",
            className
          )}
          {...props}
        />
        {label && (
          <label className="absolute left-5 top-4 text-sm text-white/50 transition-all peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-cyan-400 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:text-xs">
            {label}
          </label>
        )}
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

NeonInput.displayName = 'NeonInput'
export default NeonInput
