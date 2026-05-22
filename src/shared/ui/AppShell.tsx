import { ReactNode } from "react";
import { SafeArea } from "./SafeArea";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { WorldwideTicker } from "./presence/WorldwideTicker";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeArea className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <AppHeader title={title} />
      <WorldwideTicker />
      <main
        className="flex-1 pb-28"
        style={{ paddingBottom: "calc(96px + var(--safe-bottom))" }}
      >
        {children}
      </main>
      <BottomNav />
    </SafeArea>
  );
}
