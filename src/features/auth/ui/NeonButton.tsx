/**
 * NeonButton — 4-state action button (idle/loading/success/error).
 * Variants: primary (cyan→purple gradient), secondary (glass), ghost.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NeonState = "idle" | "loading" | "success" | "error";
type NeonVariant = "primary" | "secondary" | "ghost";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  state?: NeonState;
  variant?: NeonVariant;
  fullWidth?: boolean;
  leading?: ReactNode;
}

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(function NeonButton(
  {
    state = "idle",
    variant = "primary",
    fullWidth = true,
    leading,
    children,
    className,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isError = state === "error";
  const isBusy = isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isBusy || undefined}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3.5 text-[15px] font-semibold tracking-tight transition-transform duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-glow-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "active:scale-[0.985]",
        fullWidth && "w-full",
        variant === "primary" &&
          "text-white shadow-[0_10px_30px_-12px_hsl(268_92%_68%/_0.7)]",
        variant === "secondary" &&
          "border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.07]",
        variant === "ghost" &&
          "text-foreground/80 hover:bg-white/[0.04]",
        isError && "animate-[auth-shake_0.45s_ease-in-out]",
        className,
      )}
      style={
        variant === "primary"
          ? {
              backgroundImage:
                "linear-gradient(135deg, hsl(190 95% 55%), hsl(268 92% 64%) 55%, hsl(330 95% 62%))",
            }
          : undefined
      }
      {...rest}
    >
      {/* shimmer layer when loading */}
      {isLoading && (
        <span
          aria-hidden
          className="auth-shimmer absolute inset-0 rounded-2xl"
        />
      )}

      <span
        className={cn(
          "relative inline-flex items-center gap-2 transition-opacity",
          (isLoading || isSuccess) && "opacity-90",
        )}
      >
        {isLoading ? (
          <span
            aria-hidden
            className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
            style={{ animation: "auth-spin 0.7s linear infinite" }}
          />
        ) : isSuccess ? (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            style={{ animation: "auth-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        ) : leading ? (
          <span aria-hidden>{leading}</span>
        ) : null}
        {children}
      </span>
    </button>
  );
});
