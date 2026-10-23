-- =====================================================================
-- Future-proof storage RLS: school-scoped admin + self-management
-- =====================================================================
-- * A file's owner (folder = their profile id) can always manage their own
--   files — this covers admins today AND logged-in students in the future.
-- * A school's owner/admin can manage files for ANY profile in their school
--   (e.g. upload a licence for a student record).
-- =====================================================================

-- Helper: is the current user an owner/admin of their active school?
CREATE OR REPLACE FUNCTION public.storage_is_school_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.school_id = public.get_user_school_id()
      AND sm.role IN ('owner', 'admin')
  );
$$;

-- =====================================================================
-- avatars — SELECT (school-scoped, matching licenses)
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
CREATE POLICY "Authenticated users can read avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (storage.foldername(name))[1]::uuid
          AND p.school_id = public.get_user_school_id()
      )
    )
  );

-- =====================================================================
-- avatars — INSERT / UPDATE / DELETE (self OR school admin)
-- =====================================================================
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.storage_is_school_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (storage.foldername(name))[1]::uuid
            AND p.school_id = public.get_user_school_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.storage_is_school_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (storage.foldername(name))[1]::uuid
            AND p.school_id = public.get_user_school_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.storage_is_school_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (storage.foldername(name))[1]::uuid
            AND p.school_id = public.get_user_school_id()
        )
      )
    )
  );

-- =====================================================================
-- licenses — INSERT / UPDATE / DELETE (self OR school admin)
-- =====================================================================
DROP POLICY IF EXISTS "Users can upload own license" ON storage.objects;
CREATE POLICY "Users can upload own license" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'licenses'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.storage_is_school_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (storage.foldername(name))[1]::uuid
            AND p.school_id = public.get_user_school_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own license" ON storage.objects;
CREATE POLICY "Users can update own license" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'licenses'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.storage_is_school_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (storage.foldername(name))[1]::uuid
            AND p.school_id = public.get_user_school_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own license" ON storage.objects;
CREATE POLICY "Users can delete own license" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'licenses'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        public.storage_is_school_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (storage.foldername(name))[1]::uuid
            AND p.school_id = public.get_user_school_id()
        )
      )
    )
  );
