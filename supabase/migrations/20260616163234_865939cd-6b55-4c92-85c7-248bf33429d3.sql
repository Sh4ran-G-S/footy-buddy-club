
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_invited_by_profiles_fkey FOREIGN KEY (invited_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_captain_profiles_fkey FOREIGN KEY (captain_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
