
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_invited_by_user_id_fkey;
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_captain_id_fkey;
