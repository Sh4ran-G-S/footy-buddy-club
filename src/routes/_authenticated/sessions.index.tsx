import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { formatINR } from "@/lib/footy";

export const Route = createFileRoute("/_authenticated/sessions/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sessions — Footy Ledger" }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const { isOrganizer } = useAuth();
  const { data } = useQuery({
    queryKey: ["sessions", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <AppShell
      title="Sessions"
      action={isOrganizer && (
        <Link to="/sessions/new"><Button size="sm" className="gap-1.5"><Plus className="size-4" /> New</Button></Link>
      )}
    >
      <div className="space-y-2">
        {(data ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground text-center">
            No sessions yet.
          </div>
        )}
        {(data ?? []).map((s) => (
          <Link
            key={s.id}
            to="/sessions/$sessionId"
            params={{ sessionId: s.id }}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 p-3 hover:bg-card/70"
          >
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(s.date), "EEE, d MMM · p")} · ground {formatINR(s.ground_cost)}</p>
            </div>
            <span className="text-xs rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 capitalize">{s.status}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}