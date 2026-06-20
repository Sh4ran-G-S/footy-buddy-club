import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Minus, ArrowLeft, Goal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/stats")({
  ssr: false,
  head: () => ({ meta: [{ title: "Stats — Footy Ledger" }] }),
  component: SessionStats,
});

function SessionStats() {
  const { sessionId } = Route.useParams();
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();

  const sess = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => (await supabase.from("sessions").select("*").eq("id", sessionId).single()).data,
  });

  const att = useQuery({
    queryKey: ["session", sessionId, "attendance-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, user_id, goals, profiles:user_id(name)")
        .eq("session_id", sessionId)
        .order("goals", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const bump = async (id: string, current: number, delta: number) => {
    const next = Math.max(0, current + delta);
    const { error } = await supabase.from("attendance").update({ goals: next }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["session", sessionId, "attendance-stats"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  return (
    <AppShell
      title="Session stats"
      action={
        <Link to="/sessions/$sessionId" params={{ sessionId }}>
          <Button size="sm" variant="ghost" className="gap-1.5"><ArrowLeft className="size-4" /> Back</Button>
        </Link>
      }
    >
      <div className="space-y-3">
        {sess.data && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <p className="text-sm font-medium">{sess.data.title}</p>
            <p className="text-xs text-muted-foreground">Goals counted here roll into the leaderboard.</p>
          </div>
        )}

        {!isSuperAdmin && (
          <div className="rounded-xl bg-warning/10 ring-1 ring-warning/30 p-3 text-xs">
            Only super admin can edit goals. View only.
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/60">
          {(att.data ?? []).length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No players in this session yet.</div>
          )}
          {(att.data ?? []).map((a) => {
            const name = (a as unknown as { profiles: { name: string } | null }).profiles?.name || "Player";
            return (
              <div key={a.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Goal className="size-4 text-primary shrink-0" />
                  <span className="font-medium truncate">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => bump(a.id, a.goals, -1)}>
                      <Minus className="size-4" />
                    </Button>
                  )}
                  <span className="w-8 text-center font-semibold tabular-nums">{a.goals}</span>
                  {isSuperAdmin && (
                    <Button size="icon" variant="secondary" className="size-8" onClick={() => bump(a.id, a.goals, 1)}>
                      <Plus className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
