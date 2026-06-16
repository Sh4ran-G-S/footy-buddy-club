import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULT_TEAM_NAMES, formatINR } from "@/lib/footy";

export const Route = createFileRoute("/_authenticated/sessions/new")({
  ssr: false,
  head: () => ({ meta: [{ title: "New session — Footy Ledger" }] }),
  component: NewSession,
});

function NewSession() {
  const { isOrganizer, user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState(`Sunday Football`);
  const today = new Date();
  today.setHours(today.getHours() + 24);
  const [date, setDate] = useState(today.toISOString().slice(0, 16));
  const [ground, setGround] = useState(2400);
  const [expected, setExpected] = useState(15);
  const [busy, setBusy] = useState(false);

  if (!isOrganizer) {
    return <AppShell title="New session"><Forbidden /></AppShell>;
  }

  const base = expected > 0 ? Math.round(ground / expected) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({ title, date: new Date(date).toISOString(), ground_cost: ground, expected_players: expected, created_by: user!.id })
      .select("id")
      .single();
    if (error) { setBusy(false); return toast.error(error.message); }
    // create 3 default teams
    const { error: tErr } = await supabase.from("teams").insert(
      DEFAULT_TEAM_NAMES.map((team_name) => ({ session_id: data.id, team_name })),
    );
    setBusy(false);
    if (tErr) return toast.error(tErr.message);
    toast.success("Session created");
    navigate({ to: "/sessions/$sessionId", params: { sessionId: data.id } });
  };

  return (
    <AppShell title="New session">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Date & time</Label>
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Ground cost (₹)</Label>
            <Input type="number" min={0} value={ground} onChange={(e) => setGround(Number(e.target.value))} required />
          </div>
          <div className="space-y-2">
            <Label>Expected players</Label>
            <Input type="number" min={1} value={expected} onChange={(e) => setExpected(Number(e.target.value))} required />
          </div>
        </div>
        <div className="rounded-xl bg-primary/10 ring-1 ring-primary/30 p-3 text-sm">
          Base cost / player: <span className="font-semibold text-primary">{formatINR(base)}</span>
          <span className="text-muted-foreground"> · winners {formatINR(base - 20)} · losers {formatINR(base + 20)}</span>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create session"}</Button>
      </form>
    </AppShell>
  );
}

function Forbidden() {
  return <div className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">Only organizers can create sessions.</div>;
}