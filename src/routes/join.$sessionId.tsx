import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatINR } from "@/lib/footy";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/join/$sessionId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Join session — Footy Ledger" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { sessionId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<{ id: string; title: string; date: string; ground_cost: number; expected_players: number; status: string } | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [invitedBy, setInvitedBy] = useState<string>("");
  const [alreadyIn, setAlreadyIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { next: `/join/${sessionId}` }, replace: true });
    }
  }, [user, loading, sessionId, navigate]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: s } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      setSession(s as never);
      const { data: ps } = await supabase.from("profiles").select("id, name").neq("id", user.id);
      setPlayers(ps ?? []);
      const { data: existing } = await supabase.from("attendance").select("id").eq("session_id", sessionId).eq("user_id", user.id).maybeSingle();
      setAlreadyIn(!!existing);
    })();
  }, [user, sessionId]);

  const overdue = Number(profile?.outstanding_balance ?? 0) > 0;

  const join = async () => {
    if (overdue) return toast.error("Clear outstanding dues before joining a new session");
    setBusy(true);
    const { error } = await supabase
      .from("attendance")
      .insert({ session_id: sessionId, user_id: user!.id, invited_by_user_id: invitedBy || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("You're in! See you on the pitch.");
    navigate({ to: "/sessions/$sessionId", params: { sessionId } });
  };

  if (loading || !user) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!session) return <div className="min-h-screen grid place-items-center text-muted-foreground">Session not found</div>;

  return (
    <div className="min-h-screen grid place-items-center p-5">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">You're invited</p>
          <h1 className="text-xl font-semibold">{session.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{format(new Date(session.date), "EEE, d MMM · p")}</p>
          <p className="text-xs text-muted-foreground">Ground {formatINR(session.ground_cost)} · {session.expected_players} expected</p>
        </div>

        {alreadyIn ? (
          <div className="rounded-xl bg-success/10 ring-1 ring-success/30 p-3 text-sm flex items-center gap-2 text-success">
            <CheckCircle2 className="size-4" /> You're already on the list.
          </div>
        ) : overdue ? (
          <div className="rounded-xl bg-danger/10 ring-1 ring-danger/30 p-3 text-sm flex items-start gap-2 text-danger">
            <AlertTriangle className="size-4 mt-0.5" />
            <div>
              You owe {formatINR(profile?.outstanding_balance)}. Clear your dues before joining.
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm">Invited by (optional)</label>
              <Select value={invitedBy || "none"} onValueChange={(v) => setInvitedBy(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Nobody / I'm a regular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nobody / I'm a regular</SelectItem>
                  {players.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || "Player"}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">If you go overdue, your inviter is flagged with you.</p>
            </div>
            <Button onClick={join} disabled={busy} className="w-full">{busy ? "Joining…" : "Confirm spot"}</Button>
          </>
        )}

        <Button variant="ghost" className="w-full" onClick={() => navigate({ to: "/dashboard" })}>Go to dashboard</Button>
      </div>
    </div>
  );
}