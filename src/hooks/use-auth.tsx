import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "organizer" | "player";

export interface AuthProfile {
  id: string;
  name: string;
  phone: string | null;
  reliability_score: number;
  total_sessions: number;
  outstanding_balance: number;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  loading: boolean;
  isOrganizer: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const loadExtras = async (uid: string) => {
    const [{ data: prof }, { data: r }] = await Promise.all([
      (supabase.rpc as unknown as (fn: string) => Promise<{ data: AuthProfile | null }>)("get_my_profile"),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as AuthProfile | null) ?? null);
    setRoles((r ?? []).map((x: { role: AppRole }) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        // defer so we don't deadlock onAuthStateChange
        setTimeout(() => void loadExtras(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      if (event === "SIGNED_OUT") {
        qc.clear();
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        qc.invalidateQueries();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void loadExtras(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    profile,
    roles,
    loading,
    isOrganizer: roles.includes("organizer") || roles.includes("super_admin"),
    isSuperAdmin: roles.includes("super_admin"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      if (session?.user) await loadExtras(session.user.id);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}