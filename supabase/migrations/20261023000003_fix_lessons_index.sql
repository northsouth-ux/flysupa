-- Fix: lessons.profile_id must NOT be unique (a student has many lessons).
-- The base migration accidentally created a UNIQUE index; restore a plain index.
DROP INDEX IF EXISTS public.lessons_profile_id_idx;
CREATE INDEX lessons_profile_id_idx ON public.lessons (profile_id);
