
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS goals integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_goals integer NOT NULL DEFAULT 0;
