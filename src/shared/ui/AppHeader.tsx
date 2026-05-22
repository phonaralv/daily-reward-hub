import { Sparkles, Bell } from "lucide-react";
import { GlobalPulseChip } from "./presence/GlobalPulseChip";

export function AppHeader({ title }: { title: string }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-background/90 backdrop-blur border-b border-border"
      style={{ paddingTop: "calc(10px + var(--safe-top))" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="size-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-imperial)", boxShadow: "var(--shadow-glow)" }}
        >
          <Sparkles className="size-4 text-primary-foreground" />
        </div>
        <h1 className="text-base font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <GlobalPulseChip />
        <button
          aria-label="알림"
          className="size-9 rounded-full flex items-center justify-center bg-surface-2 active:scale-95 transition-transform"
        >
          <Bell className="size-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
