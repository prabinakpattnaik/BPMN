-- 20260316_update_hierarchy_level_check.sql
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_hierarchy_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_hierarchy_level_check CHECK (hierarchy_level BETWEEN 0 AND 4);

ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_hierarchy_level_check;
ALTER TABLE public.workflows ADD CONSTRAINT workflows_hierarchy_level_check CHECK (hierarchy_level BETWEEN 0 AND 4);
