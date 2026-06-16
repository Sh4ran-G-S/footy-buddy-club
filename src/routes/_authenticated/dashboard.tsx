import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { useAuth } from "@/hooks/use-auth";
import { formatINR } from "@/lib/footy";
import { Plus, TrendingDown, Trophy, AlertTriangle, CalendarDays } from "lucide-react";
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("outstanding_balance, reliability_score");
      if (error) throw error;
      const outstanding = (data ?? []).reduce((s, r) => s + Number(r.outstanding_balance || 0), 0);
      const overdue = (data ?? []).filter((r) => Number(r.outstanding_balance) > 0 && r.reliability_score < 50).length;
      return { outstanding, overdue };
    },
  });

  const leaderboard = useQuery({
    queryKey: ["dash", "leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, reliability_score, total_sessions")
        .order("reliability_score", { ascending: false })
        .order("total_sessions", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
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
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
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

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Outstanding" value={formatINR(totals.data?.outstanding ?? 0)} icon={<TrendingDown className="size-4 text-warning" />} />
          <Stat label="Overdue players" value={(totals.data?.overdue ?? 0).toString()} icon={<AlertTriangle className="size-4 text-danger" />} />
        </div>

        <div>
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
            {(upcoming.data ?? []).map((s) => (
              <Link
                key={s.id}
                to="/sessions/$sessionId"
                params={{ sessionId: s.id }}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3 hover:bg-card/70 transition-colors"
              >
                <div>
                  <p className="font-medium leading-tight">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(s.date), "EEE, d MMM · p")}</p>
                </div>
                <span className="text-xs rounded-full bg-primary/15 text-primary px-2 py-0.5 ring-1 ring-primary/30 capitalize">
                  {s.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Trophy className="size-4" /> Leaderboard</h3>
          <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/60">
            {(leaderboard.data ?? []).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-4 text-sm">{i + 1}</span>
                  <span className="font-medium">{p.name || "Player"}</span>
                </div>
                <ReliabilityBadge score={p.reliability_score} />
              </div>
            ))}
          </div>
        </div>
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