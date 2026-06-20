import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const searchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Footy Ledger" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: search.next ?? "/dashboard", replace: true });
  }, [user, loading, navigate, search.next]);

  const sendLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !name.trim()) return toast.error("Add your name and email");
    setBusy(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth${search.next ? `?next=${encodeURIComponent(search.next)}` : ""}`
        : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        data: { name: name.trim() },
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Magic link sent — check your email");
    setSent(true);
  };

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-sm">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="size-14 rounded-2xl bg-primary/15 grid place-items-center ring-1 ring-primary/40 mb-3"
          >
            <span className="text-3xl">⚽</span>
          </motion.div>
          <h1 className="text-2xl font-semibold tracking-tight text-glow">Footy Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1 italic">Sessions, dues, and dependable players.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-xl glow-primary"
        >
          {!sent ? (
            <form onSubmit={sendLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sankalp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send magic link"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                We'll email you a one-tap sign-in link. Open it on this device to come back signed in.
              </p>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <div className="size-12 rounded-full bg-primary/15 grid place-items-center mx-auto mb-3 ring-1 ring-primary/40">
                  <span className="text-2xl">📬</span>
                </div>
                <p className="text-sm">We sent a sign-in link to</p>
                <p className="text-sm font-medium">{email}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Open the email on this device and tap the link. You'll be signed in automatically.
                </p>
              </div>
              <div className="flex justify-between text-xs">
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setSent(false)} disabled={busy}>
                  Change email
                </button>
                <button className="text-primary hover:underline" onClick={() => void sendLink()} disabled={busy}>
                  Resend link
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}