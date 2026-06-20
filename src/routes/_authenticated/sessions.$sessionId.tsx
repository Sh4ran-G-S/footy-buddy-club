import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { buildUpiLink, formatINR } from "@/lib/footy";
import { Trophy, Share2, CheckCircle2, Clock, AlertTriangle, Users, BarChart3, Flag } from "lucide-react";
import { QrInvite } from "@/components/qr-invite";
import { SessionTimer } from "@/components/session-timer";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Session — Footy Ledger" }] }),
  component: SessionDetail,
});

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const { isOrganizer, isSuperAdmin } = useAuth();
  const qc = useQueryClient();

  const sess = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
      if (error) throw error;
      return data;
    },
  });
  const teams = useQuery({
    queryKey: ["session", sessionId, "teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, team_name, placement, team_members(id, user_id, profiles:user_id(name))")
        .eq("session_id", sessionId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const att = useQuery({
    queryKey: ["session", sessionId, "attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, user_id, invited_by_user_id, amount_due, payment_status, profiles:user_id(name), inviter:invited_by_user_id(name)")
        .eq("session_id", sessionId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const settings = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["session", sessionId] });
    qc.invalidateQueries({ queryKey: ["dash"] });
  };

  const setPlacement = async (teamId: string, place: number | null) => {
    const { error } = await supabase.from("teams").update({ placement: place }).eq("id", teamId);
    if (error) return toast.error(error.message);
    await supabase.from("sessions").update({ results_set: true }).eq("id", sessionId);
    refetchAll();
  };

  const endSession = async () => {
    if (!confirm("End this session? Players will see it as completed.")) return;
    const { error } = await supabase.from("sessions").update({ status: "completed" }).eq("id", sessionId);
    if (error) return toast.error(error.message);
    toast.success("Session ended");
    refetchAll();
  };
  const reopenSession = async () => {
    const { error } = await supabase.from("sessions").update({ status: "active" }).eq("id", sessionId);
    if (error) return toast.error(error.message);
    toast.success("Session reopened");
    refetchAll();
  };

  const markPaid = async (attId: string) => {
    const { error } = await supabase.from("attendance").update({ payment_status: "paid" }).eq("id", attId);
    if (error) return toast.error(error.message);
    toast.success("Marked as paid");
    refetchAll();
  };
  const markOverdue = async (attId: string) => {
    const { error } = await supabase.from("attendance").update({ payment_status: "overdue" }).eq("id", attId);
    if (error) return toast.error(error.message);
    refetchAll();
  };

  const assignToTeam = async (userId: string, teamId: string) => {
    // remove from other teams in this session first
    const teamIds = (teams.data ?? []).map((t) => t.id);
    if (teamIds.length) {
      await supabase.from("team_members").delete().in("team_id", teamIds).eq("user_id", userId);
    }
    if (teamId) {
      const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId });
      if (error) return toast.error(error.message);
    }
    refetchAll();
  };

  const copyInvite = async () => {
    const url = `${window.location.origin}/join/${sessionId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  if (sess.isLoading) return <AppShell title="Session">Loading…</AppShell>;
  if (!sess.data) return <AppShell title="Session">Not found</AppShell>;

  const s = sess.data;
  const base = s.expected_players > 0 ? Math.round(Number(s.ground_cost) / s.expected_players) : 0;
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${sessionId}` : null;

  const teamOf = (uid: string) =>
    (teams.data ?? []).find((t) => (t.team_members ?? []).some((m: { user_id: string }) => m.user_id === uid))?.id ?? "";

  return (
    <AppShell title={s.title} action={<Button size="sm" variant="secondary" onClick={copyInvite} className="gap-1.5"><Share2 className="size-4" /> Invite</Button>}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">{format(new Date(s.date), "EEE, d MMM yyyy · p")}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
            <Stat label="Ground" value={formatINR(s.ground_cost)} />
            <Stat label="Players" value={`${(att.data ?? []).length}/${s.expected_players}`} />
            <Stat label="Base" value={formatINR(base)} />
          </div>
        </div>

        <QrInvite url={inviteUrl} />

        <SessionTimer sessionId={sessionId} />

        <div className="grid grid-cols-2 gap-2">
          <Link to="/sessions/$sessionId/stats" params={{ sessionId }}>
            <Button variant="secondary" className="w-full gap-1.5"><BarChart3 className="size-4" /> Goal stats</Button>
          </Link>
          {isSuperAdmin && (
            s.status === "completed" ? (
              <Button variant="ghost" className="w-full gap-1.5" onClick={reopenSession}>
                <Flag className="size-4" /> Reopen session
              </Button>
            ) : (
              <Button variant="default" className="w-full gap-1.5" onClick={endSession}>
                <Flag className="size-4" /> End session
              </Button>
            )
          )}
        </div>

        {/* Teams + results */}
        <section>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Trophy className="size-4" /> Teams & results</h3>
          <div className="space-y-2">
            {(teams.data ?? []).map((t) => (
              <div key={t.id} className="rounded-xl border border-border/60 bg-card/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.team_name}</div>
                  {isOrganizer ? (
                    <Select value={t.placement ? String(t.placement) : "none"} onValueChange={(v) => setPlacement(t.id, v === "none" ? null : Number(v))}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Place" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No placement</SelectItem>
                        <SelectItem value="1">🥇 1st</SelectItem>
                        <SelectItem value="2">🥈 2nd</SelectItem>
                        <SelectItem value="3">🥉 3rd</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    t.placement && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">#{t.placement}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(t.team_members ?? []).length === 0 && <span className="text-xs text-muted-foreground">No players yet</span>}
                  {(t.team_members ?? []).map((m: { id: string; profiles: { name: string } | null }) => (
                    <span key={m.id} className="text-xs rounded-full bg-secondary px-2 py-0.5">{m.profiles?.name || "Player"}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Attendees + dues */}
        <section>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Users className="size-4" /> Attendees & dues</h3>
          <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/60">
            {(att.data ?? []).length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Nobody has joined yet. Share the invite link.</div>
            )}
            {(att.data ?? []).map((a) => {
              const upi = settings.data?.upi_id
                ? buildUpiLink({
                    upiId: settings.data.upi_id,
                    payeeName: settings.data.upi_payee_name || "Organizer",
                    amount: Number(a.amount_due),
                    note: `${s.title} dues`,
                  })
                : null;
              const inviter = (a as unknown as { inviter: { name: string } | null }).inviter?.name;
              return (
                <div key={a.id} className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{(a as unknown as { profiles: { name: string } | null }).profiles?.name || "Player"}</p>
                      {inviter && <p className="text-[11px] text-muted-foreground">Invited by {inviter}</p>}
                    </div>
                    <PaymentPill status={a.payment_status} amount={Number(a.amount_due)} />
                  </div>
                  {isOrganizer && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={teamOf(a.user_id) || "none"} onValueChange={(v) => assignToTeam(a.user_id, v === "none" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Assign team" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Unassigned —</SelectItem>
                          {(teams.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {a.payment_status !== "paid" && (
                        <Button size="sm" variant="secondary" onClick={() => markPaid(a.id)}>Mark paid</Button>
                      )}
                      {a.payment_status === "pending" && (
                        <Button size="sm" variant="ghost" className="text-warning" onClick={() => markOverdue(a.id)}>Overdue</Button>
                      )}
                    </div>
                  )}
                  {upi && a.payment_status !== "paid" && (
                    <a href={upi} className="text-xs inline-flex items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30 px-3 py-1.5 hover:bg-primary/25">
                      Pay {formatINR(a.amount_due)} via UPI
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {!settings.data?.upi_id && isOrganizer && (
          <div className="rounded-xl bg-warning/10 ring-1 ring-warning/30 p-3 text-xs">
            UPI link disabled — set your UPI ID in <Link to="/settings" className="underline">Settings</Link>.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PaymentPill({ status, amount }: { status: string; amount: number }) {
  if (status === "paid")
    return <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3.5" /> Paid</span>;
  if (status === "overdue")
    return <span className="inline-flex items-center gap-1 text-xs text-danger"><AlertTriangle className="size-3.5" /> Overdue · {formatINR(amount)}</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-warning"><Clock className="size-3.5" /> Pending · {formatINR(amount)}</span>;
}