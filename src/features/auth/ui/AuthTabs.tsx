/**
 * AuthTabs — segmented control with sliding active indicator.
 */
import { cn } from "@/lib/utils";

export interface AuthTabsOption<T extends string> {
  value: T;
  label: string;
}

interface AuthTabsProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<AuthTabsOption<T>>;
  className?: string;
}

export function AuthTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: AuthTabsProps<T>) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const widthPct = 100 / options.length;

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "relative grid w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {/* sliding indicator */}
      <span
        aria-hidden
        className="absolute inset-y-1 rounded-xl transition-[transform,opacity] duration-300 ease-out"
        style={{
          width: `calc(${widthPct}% - 0.25rem)`,
          transform: `translateX(calc(${idx * 100}% + ${idx * 0.25}rem))`,
          left: "0.25rem",
          backgroundImage:
            "linear-gradient(135deg, hsl(190 95% 55% / 0.22), hsl(268 92% 64% / 0.32))",
          boxShadow:
            "inset 0 0 0 1px hsl(0 0% 100% / 0.08), 0 8px 24px -10px hsl(268 92% 68% / 0.5)",
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 rounded-xl px-3 py-2 text-[13px] font-medium tracking-tight transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
