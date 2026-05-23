import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface NeonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
  icon?: ReactNode
  rightSlot?: ReactNode
}

const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(
  ({ label, error, icon, rightSlot, className, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <div className="relative flex items-center">
          {icon && <span className="pointer-events-none absolute left-4 text-white/40">{icon}</span>}
          <input
            ref={ref}
            placeholder={placeholder ?? ' '}
            className={cn(
              "peer w-full rounded-2xl border border-white/10 bg-white/[0.03] py-4 text-white placeholder-transparent outline-none transition-all focus:border-white/30 focus:bg-white/[0.05]",
              icon ? 'pl-11 pr-5' : 'px-5',
              rightSlot && 'pr-14',
              error && 'border-red-500/50',
              className
            )}
            {...props}
          />
          {rightSlot && <span className="absolute right-2">{rightSlot}</span>}
        </div>
        {label && (
          <label className={cn(
            "pointer-events-none absolute top-4 text-sm text-white/50 transition-all peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-cyan-400 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:text-xs",
            icon ? 'left-11' : 'left-5'
          )}>
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
export { NeonInput }
