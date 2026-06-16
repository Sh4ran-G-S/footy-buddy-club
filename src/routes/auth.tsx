import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: search.next ?? "/dashboard", replace: true });
  }, [user, loading, navigate, search.next]);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return toast.error("Add your name and email");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { data: { name: name.trim() }, shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for a 6-digit code");
    setStep("otp");
  };

  const verifyOtp = async (token: string) => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
  };

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-2xl bg-primary/15 grid place-items-center ring-1 ring-primary/40 mb-3">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Footy Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">Sessions, dues, and dependable players.</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-xl">
          {step === "email" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sankalp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send 6-digit code"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                We use email codes today. Phone OTP can be swapped in once an SMS provider is configured.
              </p>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm">Enter the code sent to</p>
                <p className="text-sm font-medium">{email}</p>
              </div>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (v.length === 6) void verifyOtp(v);
                  }}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex justify-between text-xs">
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setStep("email")} disabled={busy}>
                  Change email
                </button>
                <button className="text-primary hover:underline" onClick={requestOtp as unknown as () => void} disabled={busy}>
                  Resend code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}