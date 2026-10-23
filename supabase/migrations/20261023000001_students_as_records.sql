-- =====================================================================
-- Students as records (admin-only MVP)
-- =====================================================================
-- Decouple `profiles` from `auth.users` so students are plain records
-- created by school admins, not login accounts.
--
-- * Admins keep profile.id = auth.uid()  → login + RLS unchanged.
-- * Students get a generated id + is_student = true → no auth entry,
--   they never log in.
-- =====================================================================

-- 1. Drop the hard link to auth.users + auto-generate ids for records
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Distinguish admins (false) from student records (true)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_student boolean NOT NULL DEFAULT false;

-- 3. RLS — let a school's owner/admin manage student records
--    (INSERT / UPDATE / DELETE) on top of self-management.

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = profiles.school_id
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = profiles.school_id
        AND sm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = profiles.school_id
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "School admins can delete students" ON public.profiles;
CREATE POLICY "School admins can delete students" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = profiles.school_id
        AND sm.role IN ('owner', 'admin')
    )
  );
