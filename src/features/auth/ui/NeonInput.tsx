/**
 * NeonInput — floating-label glass input with gradient focus ring.
 * - aria-invalid switches ring to pink
 * - autofill bg neutralized via .auth-input class
 * - leading icon slot
 */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NeonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  icon?: ReactNode;
  rightSlot?: ReactNode;
}

export const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(function NeonInput(
  { label, hint, error, icon, rightSlot, id, className, type = "text", ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const describedById = hint || error ? `${inputId}-desc` : undefined;
  const invalid = !!error;

  return (
    <div className="w-full">
      <div
        className={cn(
          "group relative rounded-2xl border bg-white/[0.03] transition",
          "border-white/10 focus-within:border-transparent",
          invalid && "border-[color:var(--auth-glow-pink)]/50",
        )}
        style={{
          boxShadow: invalid
            ? "0 0 0 1px hsl(330 95% 65% / 0.45), 0 0 0 4px hsl(330 95% 65% / 0.12)"
            : undefined,
        }}
      >
        {/* gradient focus ring */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-200",
            "group-focus-within:opacity-100",
            invalid && "group-focus-within:opacity-0",
          )}
          style={{
            background:
              "linear-gradient(135deg, var(--auth-glow-cyan), var(--auth-glow-purple))",
            mask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: 1,
          }}
        />

        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-150",
            // Float when input is focused or has value
            "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-[0.18em] peer-focus:text-foreground/70",
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.18em] peer-[:not(:placeholder-shown)]:text-foreground/70",
            icon && "left-11",
          )}
        >
          {label}
        </label>

        {icon ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60"
          >
            {icon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={invalid || undefined}
          aria-describedby={describedById}
          placeholder=" "
          className={cn(
            "auth-input peer block w-full rounded-2xl bg-transparent px-4 pb-2.5 pt-6 text-[15px] text-foreground outline-none placeholder:text-transparent",
            icon && "pl-11",
            rightSlot && "pr-12",
            className,
          )}
          {...rest}
        />

        {rightSlot ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        ) : null}
      </div>

      {(hint || error) && (
        <p
          id={describedById}
          aria-live="polite"
          className={cn(
            "mt-1.5 px-1 text-[12px]",
            error ? "text-[color:var(--auth-glow-pink)]" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
