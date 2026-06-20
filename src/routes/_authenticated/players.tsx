import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { formatINR } from "@/lib/footy";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Shield, Plus, Minus, Goal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/players")({
  ssr: false,
  head: () => ({ meta: [{ title: "Players — Footy Ledger" }] }),
  component: PlayersPage,
});

function PlayersPage() {
  const { isSuperAdmin, isOrganizer } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["players", isOrganizer],
    queryFn: async () => {
      let profs:
        | Array<{
            id: string;
            name: string;
            reliability_score: number;
            total_sessions: number;
            bonus_goals: number;
            outstanding_balance?: number;
          }>
        | null = null;
      if (isOrganizer) {
        const { data } = await (supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: typeof profs }>)("get_profiles_admin");
        profs = (data ?? []).slice().sort((a, b) => b.reliability_score - a.reliability_score);
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("id, name, reliability_score, total_sessions, bonus_goals")
          .order("reliability_score", { ascending: false });
        profs = data;
      }
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: goalRows } = await supabase
        .from("session_player_goals" as never)
        .select("user_id, goals") as unknown as { data: { user_id: string; goals: number }[] | null };
      const goalMap = new Map<string, number>();
      (goalRows ?? []).forEach((g) => {
        goalMap.set(g.user_id, (goalMap.get(g.user_id) ?? 0) + (g.goals ?? 0));
      });
      const roleMap = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        roleMap.set(r.user_id, arr);
      });
      return (profs ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
        session_goals: goalMap.get(p.id) ?? 0,
        total_goals: (goalMap.get(p.id) ?? 0) + (p.bonus_goals ?? 0),
      }));
    },
  });

  const setOrganizer = async (userId: string, makeOrganizer: boolean) => {
    if (makeOrganizer) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "organizer" });
      if (error) return toast.error(error.message);
      toast.success("Promoted to organizer");
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "organizer");
      if (error) return toast.error(error.message);
      toast.success("Removed organizer role");
    }
    qc.invalidateQueries({ queryKey: ["players"] });
  };

  const bumpBonus = async (userId: string, current: number, delta: number) => {
    const next = Math.max(0, current + delta);
    const { error } = await supabase.from("profiles").update({ bonus_goals: next }).eq("id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["players"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  return (
    <AppShell title="Players">
      <div className="space-y-2">
        {(data ?? []).map((p) => {
          const isOrg = p.roles.includes("organizer") || p.roles.includes("super_admin");
          const isSA = p.roles.includes("super_admin");
          return (
            <div key={p.id} className="rounded-xl border border-border/60 bg-card/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name || "Player"}</span>
                  {isSA && <span title="Super admin" className="text-primary"><ShieldCheck className="size-4" /></span>}
                  {!isSA && isOrg && <span title="Organizer" className="text-warning"><Shield className="size-4" /></span>}
                </div>
                <ReliabilityBadge score={p.reliability_score} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{p.total_sessions} sessions</span>
                {isOrganizer ? (
                  Number(p.outstanding_balance ?? 0) > 0
                    ? <span className="text-warning">Owes {formatINR(p.outstanding_balance ?? 0)}</span>
                    : <span className="text-success">Cleared</span>
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <Goal className="size-3.5 text-primary" />
                  <span className="font-medium">{p.total_goals} goals</span>
                  <span className="text-muted-foreground">
                    ({p.session_goals} tracked{p.bonus_goals ? ` + ${p.bonus_goals} legacy` : ""})
                  </span>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="size-6" onClick={() => bumpBonus(p.id, p.bonus_goals ?? 0, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <Button size="icon" variant="secondary" className="size-6" onClick={() => bumpBonus(p.id, p.bonus_goals ?? 0, 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
              {isSuperAdmin && !isSA && (
                <div className="mt-2">
                  <Button size="sm" variant={isOrg ? "ghost" : "secondary"} onClick={() => setOrganizer(p.id, !isOrg)}>
                    {isOrg ? "Remove organizer" : "Make organizer"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}