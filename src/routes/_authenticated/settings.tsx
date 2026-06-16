import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ReliabilityBadge } from "@/components/reliability-badge";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Settings — Footy Ledger" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, isOrganizer, signOut, refresh, roles } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  useEffect(() => {
    void supabase.from("app_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      setUpiId(data?.upi_id ?? "");
      setPayeeName(data?.upi_payee_name ?? "");
    });
  }, []);

  const saveProfile = async () => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name, phone }).eq("id", profile!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    refresh();
  };

  const saveSettings = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({ upi_id: upiId, upi_payee_name: payeeName, updated_at: new Date().toISOString() }).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("UPI settings saved");
  };

  const doSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <AppShell title="Settings">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Your profile</h3>
            <ReliabilityBadge score={profile?.reliability_score ?? 100} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </div>
          <Button onClick={saveProfile} disabled={busy} className="w-full">Save profile</Button>
          <p className="text-[11px] text-muted-foreground">Roles: {roles.join(", ") || "player"}</p>
        </section>

        {isOrganizer && (
          <section className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold">UPI for dues collection</h3>
            <p className="text-xs text-muted-foreground">Used to build the "Pay via UPI" button on every debt.</p>
            <div className="space-y-2">
              <Label>UPI ID</Label>
              <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@okhdfcbank" />
            </div>
            <div className="space-y-2">
              <Label>Payee name</Label>
              <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Sankalp" />
            </div>
            <Button onClick={saveSettings} disabled={busy} className="w-full">Save UPI settings</Button>
          </section>
        )}

        <Button variant="ghost" className="w-full text-danger gap-2" onClick={doSignOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </AppShell>
  );
}