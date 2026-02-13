-- Add explicit foreign key from workflows.created_by to profiles.id
-- This allows PostgREST to detect the relationship and enable joins (e.g. fetching creator's name)

DO $$ 
BEGIN
  -- We'll attempt to add the constraint. If it conflicts or exists, we might need to handle it, 
  -- but a simple ADD CONSTRAINT is usually safe if data satisfies it.
  -- We name it explicitly to be detected.
  
  -- First checking if it exists isn't strictly necessary if we name it uniquely, but good practice.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflows_created_by_profiles_fkey') THEN
      ALTER TABLE public.workflows
      ADD CONSTRAINT workflows_created_by_profiles_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;
