import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { useAuth } from "@/hooks/use-auth";
import { formatINR } from "@/lib/footy";
import { Plus, TrendingDown, Trophy, AlertTriangle, CalendarDays } from "lucide-react";
import { AnimatedCard } from "@/components/football-animations";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — Footy Ledger" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, isOrganizer } = useAuth();

  const upcoming = useQuery({
    queryKey: ["dash", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .in("status", ["upcoming", "active"])
        .order("date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = useQuery({
    queryKey: ["dash", "totals"],
    enabled: isOrganizer,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: { outstanding_balance: number; reliability_score: number }[] | null; error: Error | null }>)(
        "get_profiles_admin",
      );
      if (error) throw error;
      const outstanding = (data ?? []).reduce((s, r) => s + Number(r.outstanding_balance || 0), 0);
      const overdue = (data ?? []).filter((r) => Number(r.outstanding_balance) > 0 && r.reliability_score < 50).length;
      return { outstanding, overdue };
    },
  });

  const leaderboard = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const [{ data: profs, error }, { data: goalRows }] = await Promise.all([
        supabase.from("profiles").select("id, name, reliability_score, bonus_goals"),
        supabase.from("attendance").select("user_id, goals"),
      ]);
      if (error) throw error;
      const goalMap = new Map<string, number>();
      (goalRows ?? []).forEach((g) => goalMap.set(g.user_id, (goalMap.get(g.user_id) ?? 0) + (g.goals ?? 0)));
      return (profs ?? [])
        .map((p) => ({ ...p, goals: (goalMap.get(p.id) ?? 0) + (p.bonus_goals ?? 0) }))
        .sort((a, b) => b.goals - a.goals || b.reliability_score - a.reliability_score)
        .slice(0, 5);
    },
  });

  return (
    <AppShell
      title="Footy Ledger"
      action={
        isOrganizer && (
          <Link to="/sessions/new">
            <Button size="sm" className="gap-1.5"><Plus className="size-4" /> Session</Button>
          </Link>
        )
      }
    >
      <section className="space-y-4">
        <AnimatedCard delay={0.1}>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Trophy className="size-24 rotate-12" />
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Hello</p>
            <div className="flex items-center justify-between mt-1">
              <h2 className="text-lg font-semibold">{profile?.name || "Player"}</h2>
              <ReliabilityBadge score={profile?.reliability_score ?? 100} />
            </div>
            {Number(profile?.outstanding_balance ?? 0) > 0 && (
              <p className="mt-3 text-sm flex items-center gap-1.5 text-warning">
                <AlertTriangle className="size-4" /> You owe {formatINR(profile?.outstanding_balance)}
              </p>
            )}
          </div>
        </AnimatedCard>

        {isOrganizer && (
        <div className="grid grid-cols-2 gap-3">
          <AnimatedCard delay={0.2}>
            <Stat label="Outstanding" value={formatINR(totals.data?.outstanding ?? 0)} icon={<TrendingDown className="size-4 text-warning" />} />
          </AnimatedCard>
          <AnimatedCard delay={0.3}>
            <Stat label="Overdue players" value={(totals.data?.overdue ?? 0).toString()} icon={<AlertTriangle className="size-4 text-danger" />} />
          </AnimatedCard>
        </div>
        )}

        <AnimatedCard delay={0.4}>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><CalendarDays className="size-4" /> Upcoming</h3>
            <Link to="/sessions" className="text-xs text-muted-foreground hover:text-foreground">See all</Link>
          </div>
          <div className="space-y-2">
            {(upcoming.data ?? []).length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground text-center">
                No upcoming sessions yet.
              </div>
            )}
            {(upcoming.data ?? []).map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <Link
                  to="/sessions/$sessionId"
                  params={{ sessionId: s.id }}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3 hover:bg-card/70 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div>
                    <p className="font-medium leading-tight">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(s.date), "EEE, d MMM · p")}</p>
                  </div>
                  <span className="text-xs rounded-full bg-primary/15 text-primary px-2 py-0.5 ring-1 ring-primary/30 capitalize">
                    {s.status}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.7}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Trophy className="size-4" /> Leaderboard</h3>
          <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/60 overflow-hidden">
            {(leaderboard.data ?? []).map((p, i) => (
              <motion.div 
                key={p.id} 
                whileHover={{ backgroundColor: "rgba(var(--primary-rgb), 0.05)" }}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-4 text-sm">{i + 1}</span>
                  <span className="font-medium">{p.name || "Player"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums rounded-full bg-primary/15 text-primary ring-1 ring-primary/30 px-2 py-0.5">
                    {p.goals} goals
                  </span>
                  <ReliabilityBadge score={p.reliability_score} showScore={false} />
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </section>
    </AppShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
