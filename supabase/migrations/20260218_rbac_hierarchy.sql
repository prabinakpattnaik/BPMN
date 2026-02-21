-- 20260218_rbac_hierarchy.sql

-- Add hierarchy_level to profiles if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hierarchy_level') THEN 
        ALTER TABLE public.profiles ADD COLUMN hierarchy_level integer DEFAULT 4;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_hierarchy_level_check CHECK (hierarchy_level BETWEEN 1 AND 4);
    END IF;
END $$;

-- Add columns to workflows
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'hierarchy_level') THEN 
        ALTER TABLE public.workflows ADD COLUMN hierarchy_level integer DEFAULT 4;
        ALTER TABLE public.workflows ADD CONSTRAINT workflows_hierarchy_level_check CHECK (hierarchy_level BETWEEN 1 AND 4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'reviewer_id') THEN 
        ALTER TABLE public.workflows ADD COLUMN reviewer_id uuid REFERENCES public.profiles(id);
    END IF;
END $$;

-- Update status constraint
ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_status_check;
ALTER TABLE public.workflows ADD CONSTRAINT workflows_status_check 
CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Published', 'Rejected'));

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Remove old policies to prevent conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.workflows;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.workflows;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.workflows;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.workflows;
DROP POLICY IF EXISTS "Enable all access for owners" ON public.workflows;

-- 1. ADMIN/OWNER: Full Access
CREATE POLICY "admin_owner_full_access"
ON public.workflows
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Owner', 'Admin')
  )
);

-- 2. ANALYST: Manage Own
-- Select Own
CREATE POLICY "analyst_select_own"
ON public.workflows FOR SELECT TO authenticated
USING (
  created_by = auth.uid() AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Analyst')
);

-- Insert Own
CREATE POLICY "analyst_insert_own"
ON public.workflows FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Analyst')
);

-- Update Own (Draft/Rejected -> Draft/Under Review)
CREATE POLICY "analyst_update_own"
ON public.workflows FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() AND 
  status IN ('Draft', 'Rejected') AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Analyst')
)
WITH CHECK (
  created_by = auth.uid() AND 
  status IN ('Draft', 'Rejected', 'Under Review') AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Analyst')
);

-- Delete Own (Draft/Rejected Only)
CREATE POLICY "analyst_delete_own"
ON public.workflows FOR DELETE TO authenticated
USING (
  created_by = auth.uid() AND 
  status IN ('Draft', 'Rejected') AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Analyst')
);

-- 3. REVIEWER: Review Assigned
-- Select Assigned
CREATE POLICY "reviewer_select_assigned"
ON public.workflows FOR SELECT TO authenticated
USING (
  reviewer_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Reviewer')
);

-- Update Assigned (Under Review -> Approved/Rejected)
CREATE POLICY "reviewer_update_assigned"
ON public.workflows FOR UPDATE TO authenticated
USING (
  reviewer_id = auth.uid() AND
  status = 'Under Review' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Reviewer')
)
WITH CHECK (
  reviewer_id = auth.uid() AND
  status IN ('Approved', 'Rejected') AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Reviewer')
);

-- 4. VIEWER: View Published Hierarchy
-- Logic: Viewer Level L1(1) sees >= 1. Viewer L4(4) sees >= 4.
-- Access if user_level <= workflow_level
CREATE POLICY "viewer_select_published"
ON public.workflows FOR SELECT TO authenticated
USING (
  status = 'Published' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Viewer'
    AND hierarchy_level <= workflows.hierarchy_level
  )
);
