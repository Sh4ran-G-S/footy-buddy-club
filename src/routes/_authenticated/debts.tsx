import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { buildUpiLink, formatINR } from "@/lib/footy";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/debts")({
  ssr: false,
  head: () => ({ meta: [{ title: "Debts — Footy Ledger" }] }),
  component: DebtsPage,
});

function DebtsPage() {
  const { isOrganizer } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, amount_due, payment_status, session_id, user_id, sessions:session_id(title, date), profiles:user_id(name), inviter:invited_by_user_id(name)")
        .in("payment_status", ["pending", "overdue"])
        .order("payment_status", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const settings = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const markPaid = async (id: string) => {
    const { error } = await supabase.from("attendance").update({ payment_status: "paid" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as paid");
    qc.invalidateQueries({ queryKey: ["debts"] });
    qc.invalidateQueries({ queryKey: ["dash"] });
  };

  const total = (data ?? []).reduce((s, r) => s + Number(r.amount_due), 0);

  return (
    <AppShell title="Open debts">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 mb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total outstanding</p>
        <p className="text-2xl font-semibold tabular-nums">{formatINR(total)}</p>
      </div>
      <div className="space-y-2">
        {(data ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-sm text-center text-muted-foreground">
            All clear — no open debts. ⚽
          </div>
        )}
        {(data ?? []).map((r) => {
          const inviter = (r as unknown as { inviter: { name: string } | null }).inviter?.name;
          const player = (r as unknown as { profiles: { name: string } | null }).profiles?.name;
          const sessTitle = (r as unknown as { sessions: { title: string } | null }).sessions?.title;
          const upi = settings.data?.upi_id
            ? buildUpiLink({ upiId: settings.data.upi_id, payeeName: settings.data.upi_payee_name || "Organizer", amount: Number(r.amount_due), note: `${sessTitle} dues` })
            : null;
          return (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{player} owes {formatINR(r.amount_due)}</p>
                  <p className="text-xs text-muted-foreground">
                    <Link to="/sessions/$sessionId" params={{ sessionId: r.session_id }} className="hover:underline">{sessTitle}</Link>
                    {inviter && <> · Invited by <span className="text-foreground/80">{inviter}</span></>}
                  </p>
                </div>
                <span className={`text-[11px] rounded-full px-2 py-0.5 ${r.payment_status === "overdue" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"}`}>
                  {r.payment_status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {upi && <a href={upi} className="text-xs inline-flex items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30 px-3 py-1.5">Pay via UPI</a>}
                {isOrganizer && <Button size="sm" variant="secondary" onClick={() => markPaid(r.id)}>Mark paid</Button>}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}