-- =====================================================================
-- Drop the "completion" tracking (seen/understood → Trained/Mastered)
-- =====================================================================
-- The topic progress tags are removed to simplify the UI. Topics are now
-- simply associated to a lesson, with no completion state. This drops:
--   * the `lesson_item_details_view` reference to completion_degree
--   * the `lesson_item_associations.completion_degree` column
--   * the `completion_status` enum type
-- =====================================================================

-- 1. Recreate the details view WITHOUT completion_degree (it depends on it)
DROP VIEW IF EXISTS public.lesson_item_details_view;
CREATE VIEW public.lesson_item_details_view
WITH (security_invoker = on) AS
  SELECT lia.lesson_id,
         lia.lesson_item_id,
         li.title,
         li.description
  FROM public.lesson_item_associations lia
  JOIN public.lessons_items li ON lia.lesson_item_id = li.id;

-- Supabase default privileges auto-grant new objects to anon; revoke it back.
REVOKE ALL ON public.lesson_item_details_view FROM anon;

-- 2. Drop the column, then the enum type it uses.
ALTER TABLE public.lesson_item_associations
  DROP COLUMN IF EXISTS completion_degree;

DROP TYPE IF EXISTS public.completion_status;
