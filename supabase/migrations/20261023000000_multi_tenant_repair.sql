-- =====================================================================
-- FlySupa — Multi-Tenant Repair & Completion (IDEMPOTENT)
-- =====================================================================
-- Brings the database to the correct final state regardless of what has
-- already been (partially) applied. Safe to run multiple times.
--
-- Fixes vs. the previous migration:
--   * Fully idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
--     DROP POLICY IF EXISTS / DO $$ enum guards / CREATE OR REPLACE).
--   * `get_user_school_id()` now reads the ACTIVE school from
--     `profiles.school_id` (deterministic) instead of LIMIT 1 over memberships.
--   * profiles SELECT/UPDATE policies now include `OR id = auth.uid()`
--     so a fresh signup can read/update its own row before joining a school.
--   * `school_id` and `platform_admin` can no longer be self-assigned
--     (guard trigger) — closes the tenant-escape / privilege-escalation hole.
--   * School creation is a SECURITY DEFINER RPC (atomic) instead of 3
--     separate client inserts.
--   * Revokes all `anon` grants (the old schema granted INSERT/UPDATE/DELETE
--     to `anon` on every table) and re-grants only what is needed.
--   * Re-grants `authenticated` on the 4 core tables (the previous
--     "self-contained" migration forgot to).
--   * Recreates `lesson_item_details_view` with security_invoker so it
--     respects RLS (the old view bypassed tenant isolation).
--   * Storage policies use folder-per-user instead of the broken
--     substring-on-UUID check.
-- =====================================================================

-- 0. Enums (Postgres has no CREATE TYPE IF NOT EXISTS)
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.completion_status AS ENUM ('Trained', 'Mastered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.school_role AS ENUM ('owner', 'admin', 'instructor', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 1. Base tables
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  updated_at timestamptz,
  nome_utente text,
  avatar_url text,
  admin boolean DEFAULT false,
  email text,
  phone text DEFAULT '+41 (0) '::text,
  date_of_birth date,
  cognome_utente text,
  nip text,
  address text,
  sensibilizzazione boolean,
  licenza_date date,
  full_name text,
  soccorritori boolean,
  license_url text
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  amount_hours integer NOT NULL DEFAULT 0,
  date date,
  time time
);

CREATE TABLE IF NOT EXISTS public.lessons_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.lesson_item_associations (
  lesson_id bigint NOT NULL,
  lesson_item_id bigint NOT NULL,
  completion_degree public.completion_status,
  PRIMARY KEY (lesson_id, lesson_item_id)
);

-- =====================================================================
-- 2. Tenant tables
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  owner_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.school_members (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  school_id uuid NOT NULL,
  role public.school_role NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  role public.school_role NOT NULL DEFAULT 'student',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid
);

-- =====================================================================
-- 3. Tenant columns on existing tables (idempotent)
-- =====================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_url text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.lessons_items ADD COLUMN IF NOT EXISTS school_id uuid;

-- =====================================================================
-- 4. Indexes / constraints (idempotent)
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles (email);
CREATE INDEX IF NOT EXISTS lessons_profile_id_idx ON public.lessons (profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS school_members_user_school_idx ON public.school_members (user_id, school_id);

-- FKs on the tenant columns
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_school_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_school_id_fkey;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.lessons_items
  DROP CONSTRAINT IF EXISTS lessons_items_school_id_fkey;
ALTER TABLE public.lessons_items
  ADD CONSTRAINT lessons_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.school_members
  DROP CONSTRAINT IF EXISTS school_members_user_id_fkey;
ALTER TABLE public.school_members
  ADD CONSTRAINT school_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.school_members
  DROP CONSTRAINT IF EXISTS school_members_school_id_fkey;
ALTER TABLE public.school_members
  ADD CONSTRAINT school_members_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_school_id_fkey;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_created_by_fkey;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- =====================================================================
-- 5. Helper functions (SECURITY DEFINER, empty search_path)
-- =====================================================================
-- Active school: read from the profile (deterministic single source of truth).
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- =====================================================================
-- 6. SECURITY DEFINER RPCs (the ONLY way to mutate school_id / membership)
-- =====================================================================
-- Create a school atomically: school + owner membership + profile.school_id.
CREATE OR REPLACE FUNCTION public.create_school(school_name text, school_slug text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_school_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.schools (name, slug, owner_id)
  VALUES (school_name, school_slug, auth.uid())
  RETURNING id INTO new_school_id;

  INSERT INTO public.school_members (user_id, school_id, role)
  VALUES (auth.uid(), new_school_id, 'owner')
  ON CONFLICT (user_id, school_id) DO NOTHING;

  UPDATE public.profiles SET school_id = new_school_id WHERE id = auth.uid();

  RETURN json_build_object(
    'id', new_school_id,
    'name', school_name,
    'slug', school_slug,
    'owner_id', auth.uid(),
    'created_at', now()
  );
END;
$$;

-- Switch the active school (must already be a member).
CREATE OR REPLACE FUNCTION public.set_active_school(target_school_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = auth.uid() AND school_id = target_school_id
  ) THEN
    UPDATE public.profiles SET school_id = target_school_id WHERE id = auth.uid();
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- Join a school via invite token (validates server-side).
CREATE OR REPLACE FUNCTION public.join_school_via_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  inv_record RECORD;
BEGIN
  SELECT * INTO inv_record FROM public.invites
  WHERE token = invite_token AND used_at IS NULL AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invito non valido o scaduto');
  END IF;

  INSERT INTO public.school_members (user_id, school_id, role)
  VALUES (auth.uid(), inv_record.school_id, inv_record.role)
  ON CONFLICT (user_id, school_id) DO NOTHING;

  UPDATE public.profiles SET school_id = inv_record.school_id WHERE id = auth.uid();

  UPDATE public.invites
  SET used_at = now(), used_by = auth.uid()
  WHERE token = invite_token;

  RETURN json_build_object(
    'success', true,
    'school_id', inv_record.school_id,
    'role', inv_record.role
  );
END;
$$;

-- =====================================================================
-- 7. Guard trigger: block self-assignment of school_id / platform_admin
-- =====================================================================
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.platform_admin IS DISTINCT FROM OLD.platform_admin
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform_admin cannot be self-assigned';
  END IF;

  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    -- leaving a school (NULL) is always allowed
    IF NEW.school_id IS NOT NULL THEN
      -- only allow moving to a school the user is already a member of
      IF NOT public.is_platform_admin()
         AND NOT EXISTS (
           SELECT 1 FROM public.school_members
           WHERE user_id = NEW.id AND school_id = NEW.school_id
         ) THEN
        RAISE EXCEPTION 'Cannot change school_id to a school you are not a member of';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- =====================================================================
-- 8. handle_new_user trigger (creates a profile on signup)
-- =====================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_minimal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'avatar_url', null)
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_minimal();

-- =====================================================================
-- 9. Enable RLS on every table
-- =====================================================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_item_associations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 10. RLS policies (drop old, create correct)
-- =====================================================================
-- Drop every legacy policy (single-tenant "public" policies included)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lessons_items;
DROP POLICY IF EXISTS "Enable update for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- ---- schools ----
DROP POLICY IF EXISTS "Members can view their school" ON public.schools;
CREATE POLICY "Members can view their school" ON public.schools
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR owner_id = auth.uid() OR id = public.get_user_school_id());

DROP POLICY IF EXISTS "Users can create their school" ON public.schools;
CREATE POLICY "Users can create their school" ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update school" ON public.schools;
CREATE POLICY "Owner can update school" ON public.schools
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_platform_admin() OR owner_id = auth.uid());

-- ---- school_members ----
DROP POLICY IF EXISTS "Members can view school roster" ON public.school_members;
CREATE POLICY "Members can view school roster" ON public.school_members
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "School owner can add members" ON public.school_members;
CREATE POLICY "School owner can add members" ON public.school_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_members.school_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can remove members" ON public.school_members;
CREATE POLICY "Owner can remove members" ON public.school_members
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = school_members.school_id
        AND sm.role IN ('owner', 'admin')
    )
  );

-- ---- profiles ----
DROP POLICY IF EXISTS "School members can view profiles" ON public.profiles;
CREATE POLICY "School members can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR id = auth.uid() OR school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- lessons ----
DROP POLICY IF EXISTS "School members can view lessons" ON public.lessons;
CREATE POLICY "School members can view lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "School members can insert lessons" ON public.lessons;
CREATE POLICY "School members can insert lessons" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "School members can update lessons" ON public.lessons;
CREATE POLICY "School members can update lessons" ON public.lessons
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR school_id = public.get_user_school_id())
  WITH CHECK (public.is_platform_admin() OR school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "School members can delete lessons" ON public.lessons;
CREATE POLICY "School members can delete lessons" ON public.lessons
  FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR school_id = public.get_user_school_id());

-- ---- lessons_items ----
DROP POLICY IF EXISTS "School members can view lesson items" ON public.lessons_items;
CREATE POLICY "School members can view lesson items" ON public.lessons_items
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR school_id = public.get_user_school_id() OR school_id IS NULL);

DROP POLICY IF EXISTS "School members can insert lesson items" ON public.lessons_items;
CREATE POLICY "School members can insert lesson items" ON public.lessons_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "School members can update lesson items" ON public.lessons_items;
CREATE POLICY "School members can update lesson items" ON public.lessons_items
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR school_id = public.get_user_school_id())
  WITH CHECK (public.is_platform_admin() OR school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "School members can delete lesson items" ON public.lessons_items;
CREATE POLICY "School members can delete lesson items" ON public.lessons_items
  FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR school_id = public.get_user_school_id());

-- ---- lesson_item_associations ----
DROP POLICY IF EXISTS "School members can view associations" ON public.lesson_item_associations;
CREATE POLICY "School members can view associations" ON public.lesson_item_associations
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id AND l.school_id = public.get_user_school_id()
    )
  );

DROP POLICY IF EXISTS "School members can insert associations" ON public.lesson_item_associations;
CREATE POLICY "School members can insert associations" ON public.lesson_item_associations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id AND l.school_id = public.get_user_school_id()
    )
  );

DROP POLICY IF EXISTS "School members can update associations" ON public.lesson_item_associations;
CREATE POLICY "School members can update associations" ON public.lesson_item_associations
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id AND l.school_id = public.get_user_school_id()
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id AND l.school_id = public.get_user_school_id()
    )
  );

DROP POLICY IF EXISTS "School members can delete associations" ON public.lesson_item_associations;
CREATE POLICY "School members can delete associations" ON public.lesson_item_associations
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id AND l.school_id = public.get_user_school_id()
    )
  );

-- ---- invites ----
DROP POLICY IF EXISTS "Admins can create invites" ON public.invites;
CREATE POLICY "Admins can create invites" ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = invites.school_id
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can view their invites" ON public.invites;
CREATE POLICY "Admins can view their invites" ON public.invites
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = invites.school_id
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Anyone can validate invite by token" ON public.invites;
CREATE POLICY "Anyone can validate invite by token" ON public.invites
  FOR SELECT TO anon, authenticated
  USING (used_at IS NULL AND expires_at > now());

DROP POLICY IF EXISTS "Admins can delete invites" ON public.invites;
CREATE POLICY "Admins can delete invites" ON public.invites
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.user_id = auth.uid()
        AND sm.school_id = invites.school_id
        AND sm.role IN ('owner', 'admin')
    )
  );

-- =====================================================================
-- 11. Grants — revoke dangerous anon grants, grant what's needed
-- =====================================================================
REVOKE ALL ON public.lesson_item_associations FROM anon;
REVOKE ALL ON public.lessons FROM anon;
REVOKE ALL ON public.lessons_items FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.schools FROM anon;
REVOKE ALL ON public.school_members FROM anon;
REVOKE ALL ON public.invites FROM anon;

-- anon only needs SELECT on invites to validate a token pre-login
GRANT SELECT ON public.invites TO anon;

-- Core tables → authenticated (the previous migration forgot these)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_item_associations TO authenticated;

-- Tenant tables → authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;

-- service_role → everything
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.lessons TO service_role;
GRANT ALL ON public.lessons_items TO service_role;
GRANT ALL ON public.lesson_item_associations TO service_role;
GRANT ALL ON public.schools TO service_role;
GRANT ALL ON public.school_members TO service_role;
GRANT ALL ON public.invites TO service_role;

-- =====================================================================
-- 12. Views — recreate with security_invoker so RLS applies
-- =====================================================================
DROP VIEW IF EXISTS public.lesson_item_details_view;
CREATE VIEW public.lesson_item_details_view
WITH (security_invoker = on) AS
  SELECT lia.lesson_id,
         lia.lesson_item_id,
         lia.completion_degree,
         li.title,
         li.description
  FROM public.lesson_item_associations lia
  JOIN public.lessons_items li ON lia.lesson_item_id = li.id;

-- =====================================================================
-- 13. Storage — buckets + folder-per-user policies
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('licenses', 'licenses', false, 52428800, ARRAY['image/png', 'image/jpeg', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- avatars
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
CREATE POLICY "Authenticated users can read avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- licenses
DROP POLICY IF EXISTS "School members can read licenses" ON storage.objects;
CREATE POLICY "School members can read licenses" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'licenses'
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

DROP POLICY IF EXISTS "Users can upload own license" ON storage.objects;
CREATE POLICY "Users can upload own license" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'licenses' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own license" ON storage.objects;
CREATE POLICY "Users can update own license" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'licenses' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own license" ON storage.objects;
CREATE POLICY "Users can delete own license" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'licenses' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 14. Hardening (idempotent cleanup of pre-existing grants/policies)
-- =====================================================================
-- Drop the orphaned PUBLIC avatar-read policy from the old migration.
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;

-- anon must have zero access to the view (Supabase default privileges
-- auto-grant new objects to anon; revoke it back).
REVOKE ALL ON public.lesson_item_details_view FROM anon;

-- authenticated must not hold TRUNCATE (it bypasses RLS and is never used
-- by the app; PostgREST does not expose it).
REVOKE TRUNCATE ON public.profiles FROM authenticated;
REVOKE TRUNCATE ON public.lessons FROM authenticated;
REVOKE TRUNCATE ON public.lessons_items FROM authenticated;
REVOKE TRUNCATE ON public.lesson_item_associations FROM authenticated;
REVOKE TRUNCATE ON public.schools FROM authenticated;
REVOKE TRUNCATE ON public.school_members FROM authenticated;
REVOKE TRUNCATE ON public.invites FROM authenticated;
