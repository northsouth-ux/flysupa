-- =====================================================================
-- Add missing FKs on lesson_item_associations + clean up orphans
-- =====================================================================
-- lesson_item_associations had no FKs to lessons/lessons_items, so:
--   * PostgREST embeds (lessons_items!lesson_item_id(*)) failed with PGRST200
--   * deleting a lesson/school left orphaned association rows behind
-- =====================================================================

-- 1. Remove orphaned rows (references to deleted lessons/items)
DELETE FROM public.lesson_item_associations lia
WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lia.lesson_id)
   OR NOT EXISTS (SELECT 1 FROM public.lessons_items li WHERE li.id = lia.lesson_item_id);

-- 2. Add the FKs (also enables PostgREST embeds)
ALTER TABLE public.lesson_item_associations
  DROP CONSTRAINT IF EXISTS lesson_item_associations_lesson_id_fkey;
ALTER TABLE public.lesson_item_associations
  DROP CONSTRAINT IF EXISTS lesson_item_associations_lesson_item_id_fkey;

ALTER TABLE public.lesson_item_associations
  ADD CONSTRAINT lesson_item_associations_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_item_associations
  ADD CONSTRAINT lesson_item_associations_lesson_item_id_fkey
    FOREIGN KEY (lesson_item_id) REFERENCES public.lessons_items(id) ON DELETE CASCADE;
