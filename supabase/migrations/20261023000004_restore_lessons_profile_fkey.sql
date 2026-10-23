-- =====================================================================
-- Restore lessons.profile_id -> profiles.id foreign key
-- =====================================================================
-- The multi-tenant repair migration recreated the `lessons` table with
-- only an index on profile_id (no FK). PostgREST needs the FK to resolve
-- the `profiles(...)` embed, so `select=...,profiles(...)` on /home's
-- "Prossime lezioni" query failed with PGRST200 and returned no rows.
-- =====================================================================
ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_profile_id_fkey;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
