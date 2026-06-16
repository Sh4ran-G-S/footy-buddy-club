
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'organizer', 'player');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE public.session_status AS ENUM ('upcoming', 'active', 'completed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  reliability_score INT NOT NULL DEFAULT 100,
  total_sessions INT NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_organizer(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'organizer')
  )
$$;

-- ============ APP SETTINGS (singleton) ============
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  upi_id TEXT,
  upi_payee_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings (id, upi_id, upi_payee_name) VALUES (1, '', 'Organizer');
GRANT SELECT ON public.app_settings TO authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============ SESSIONS ============
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  ground_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  expected_players INT NOT NULL DEFAULT 15,
  status public.session_status NOT NULL DEFAULT 'upcoming',
  created_by UUID REFERENCES auth.users(id),
  results_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ============ TEAMS ============
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  captain_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  placement INT CHECK (placement IN (1,2,3)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- profiles
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_organizer" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_organizer(auth.uid())) WITH CHECK (public.is_organizer(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- user_roles
CREATE POLICY "roles_select_all_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_insert_super_admin" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "roles_delete_super_admin" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- app_settings
CREATE POLICY "settings_select_all_auth" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_update_organizer" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.is_organizer(auth.uid())) WITH CHECK (public.is_organizer(auth.uid()));

-- sessions
CREATE POLICY "sessions_select_all_auth" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_insert_organizer" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_organizer(auth.uid()));
CREATE POLICY "sessions_update_organizer" ON public.sessions FOR UPDATE TO authenticated
  USING (public.is_organizer(auth.uid())) WITH CHECK (public.is_organizer(auth.uid()));
CREATE POLICY "sessions_delete_organizer" ON public.sessions FOR DELETE TO authenticated
  USING (public.is_organizer(auth.uid()));

-- attendance
CREATE POLICY "attendance_select_all_auth" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert_self_or_organizer" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_organizer(auth.uid()));
CREATE POLICY "attendance_update_organizer" ON public.attendance FOR UPDATE TO authenticated
  USING (public.is_organizer(auth.uid())) WITH CHECK (public.is_organizer(auth.uid()));
CREATE POLICY "attendance_delete_organizer" ON public.attendance FOR DELETE TO authenticated
  USING (public.is_organizer(auth.uid()));

-- teams
CREATE POLICY "teams_select_all_auth" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_write_organizer" ON public.teams FOR ALL TO authenticated
  USING (public.is_organizer(auth.uid())) WITH CHECK (public.is_organizer(auth.uid()));

-- team_members
CREATE POLICY "team_members_select_all_auth" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_write_organizer" ON public.team_members FOR ALL TO authenticated
  USING (public.is_organizer(auth.uid())) WITH CHECK (public.is_organizer(auth.uid()));

-- ============ TRIGGERS ============
-- New user: create profile, assign 'player', first user becomes super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_super_admin BOOLEAN;
  display_name TEXT;
  phone_val TEXT;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Player');
  phone_val := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');

  INSERT INTO public.profiles (id, name, phone)
  VALUES (NEW.id, display_name, phone_val)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO has_super_admin;
  IF NOT has_super_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recalculate per-player dues for a session
CREATE OR REPLACE FUNCTION public.recalc_session_dues(_session_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
  base_cost NUMERIC;
  attendee_count INT;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id = _session_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COUNT(*) INTO attendee_count FROM public.attendance WHERE session_id = _session_id;
  IF attendee_count = 0 THEN RETURN; END IF;

  base_cost := ROUND(s.ground_cost / attendee_count, 2);

  -- default: base cost for everyone
  UPDATE public.attendance SET amount_due = base_cost WHERE session_id = _session_id;

  -- adjust by placement if results set
  IF s.results_set THEN
    -- 1st place: -20
    UPDATE public.attendance a SET amount_due = base_cost - 20
      WHERE a.session_id = _session_id
        AND a.user_id IN (
          SELECT tm.user_id FROM public.team_members tm
          JOIN public.teams t ON t.id = tm.team_id
          WHERE t.session_id = _session_id AND t.placement = 1
        );
    -- 3rd place: +20
    UPDATE public.attendance a SET amount_due = base_cost + 20
      WHERE a.session_id = _session_id
        AND a.user_id IN (
          SELECT tm.user_id FROM public.team_members tm
          JOIN public.teams t ON t.id = tm.team_id
          WHERE t.session_id = _session_id AND t.placement = 3
        );
  END IF;
END; $$;

-- Recalc outstanding balance & reliability for a user
CREATE OR REPLACE FUNCTION public.recalc_user_stats(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  outstanding NUMERIC;
  paid_count INT;
  overdue_count INT;
  total_sess INT;
  score INT;
BEGIN
  SELECT COALESCE(SUM(amount_due), 0) INTO outstanding
    FROM public.attendance
    WHERE user_id = _user_id AND payment_status IN ('pending', 'overdue');

  SELECT COUNT(*) INTO paid_count FROM public.attendance
    WHERE user_id = _user_id AND payment_status = 'paid';
  SELECT COUNT(*) INTO overdue_count FROM public.attendance
    WHERE user_id = _user_id AND payment_status = 'overdue';
  SELECT COUNT(*) INTO total_sess FROM public.attendance WHERE user_id = _user_id;

  score := 100 + paid_count - (overdue_count * 20);
  -- extra penalty for multiple overdue
  IF overdue_count > 1 THEN
    score := score - ((overdue_count - 1) * 10);
  END IF;
  IF score < 0 THEN score := 0; END IF;
  IF score > 100 AND overdue_count > 0 THEN score := 100; END IF;

  UPDATE public.profiles
    SET outstanding_balance = outstanding,
        total_sessions = total_sess,
        reliability_score = score
    WHERE id = _user_id;
END; $$;

-- Trigger: after attendance change, recalc that user's stats
CREATE OR REPLACE FUNCTION public.trg_attendance_recalc()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_user_stats(OLD.user_id);
    PERFORM public.recalc_session_dues(OLD.session_id);
    RETURN OLD;
  ELSE
    -- set paid_at when transitioning to paid
    IF TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' THEN
      NEW.paid_at := now();
    END IF;
    PERFORM public.recalc_user_stats(NEW.user_id);
    RETURN NEW;
  END IF;
END; $$;

CREATE TRIGGER attendance_recalc_after
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.trg_attendance_recalc();

-- Trigger: when teams placement changes, recalc session dues
CREATE OR REPLACE FUNCTION public.trg_teams_recalc()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_session_dues(OLD.session_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_session_dues(NEW.session_id);
    RETURN NEW;
  END IF;
END; $$;

CREATE TRIGGER teams_recalc_after
AFTER INSERT OR UPDATE OR DELETE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.trg_teams_recalc();

-- Trigger: team_members change recalcs (placement billing depends on memberships)
CREATE TRIGGER team_members_recalc_after
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.trg_teams_recalc();

-- Mark overdue: helper to be called by organizer; auto on session completion if pending
CREATE OR REPLACE FUNCTION public.mark_session_overdue(_session_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.attendance
    SET payment_status = 'overdue'
    WHERE session_id = _session_id AND payment_status = 'pending';
END; $$;
