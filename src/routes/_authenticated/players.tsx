import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { formatINR } from "@/lib/footy";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/players")({
  ssr: false,
  head: () => ({ meta: [{ title: "Players — Footy Ledger" }] }),
  component: PlayersPage,
});

function PlayersPage() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("reliability_score", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        roleMap.set(r.user_id, arr);
      });
      return (profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
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
                {Number(p.outstanding_balance) > 0
                  ? <span className="text-warning">Owes {formatINR(p.outstanding_balance)}</span>
                  : <span className="text-success">Cleared</span>}
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