
-- 1) profiles: column-level grants hide phone & outstanding_balance from peers
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, total_sessions, reliability_score, bonus_goals, created_at) ON public.profiles TO authenticated;

-- Self can still see their full row via this function
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Organizers can see full profile rows via this function
CREATE OR REPLACE FUNCTION public.get_profiles_admin()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles
  WHERE public.is_organizer(auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_profiles_admin() TO authenticated;

-- 2) attendance: restrict row visibility to self or organizer
DROP POLICY IF EXISTS attendance_select_all_auth ON public.attendance;
CREATE POLICY attendance_select_self_or_organizer
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_organizer(auth.uid()));

-- 3) View exposing only goals per session (no dues) so per-session leaderboard still works for everyone
CREATE OR REPLACE VIEW public.session_player_goals
WITH (security_invoker = off) AS
  SELECT a.id, a.session_id, a.user_id, a.goals, p.name
  FROM public.attendance a
  LEFT JOIN public.profiles p ON p.id = a.user_id;
GRANT SELECT ON public.session_player_goals TO authenticated;

-- 4) Helper so non-organizers can still display joined-count on a session page
CREATE OR REPLACE FUNCTION public.count_session_players(_session_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.attendance WHERE session_id = _session_id;
$$;
GRANT EXECUTE ON FUNCTION public.count_session_players(uuid) TO authenticated;
