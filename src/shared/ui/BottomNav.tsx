import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Target, Gamepad2, Wallet, UserCircle2 } from "lucide-react";
import { t } from "@/shared/config/i18n";

const TABS = [
  { to: "/",          icon: Home,         labelKey: "nav.home"    as const },
  { to: "/missions",  icon: Target,       labelKey: "nav.missions" as const },
  { to: "/play-free", icon: Gamepad2,     labelKey: "nav.play"    as const },
  { to: "/wallet",    icon: Wallet,       labelKey: "nav.wallet"  as const },
  { to: "/account",   icon: UserCircle2,  labelKey: "nav.account" as const },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface-1/95 backdrop-blur"
      style={{
        paddingBottom: "calc(8px + var(--safe-bottom))",
        paddingTop: 8,
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      <ul className="grid grid-cols-5 gap-1 px-2">
        {TABS.map(({ to, icon: Icon, labelKey }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors"
              >
                <Icon
                  className={`size-5 transition-transform ${active ? "text-primary scale-110" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {t(labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
