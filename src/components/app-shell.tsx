import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, Wallet, Users, Settings } from "lucide-react";
import { FloatingFootball } from "./football-animations";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/debts", label: "Debts", icon: Wallet },
  { to: "/players", label: "Players", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex flex-col selection:bg-primary selection:text-primary-foreground">
      <FloatingFootball />
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/75 border-b border-border/60">
        <div className="mx-auto max-w-screen-sm px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="size-7 rounded-md bg-primary/20 grid place-items-center ring-1 ring-primary/40"
            >
              <span className="text-primary text-sm">⚽</span>
            </motion.div>
            <h1 className="font-semibold tracking-tight">{title}</h1>
          </div>
          {action}
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-screen-sm px-4 pt-4 pb-28">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-xl bg-background/85 border-t border-border/60">
        <div className="mx-auto max-w-screen-sm grid grid-cols-5">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "drop-shadow-[0_0_8px_oklch(0.78_0.21_145_/_0.6)]")} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}