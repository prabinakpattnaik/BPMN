-- Add Super Admin to RLS policies
-- 1. Update admin_owner_full_access to include Super Admin
DROP POLICY IF EXISTS "admin_owner_full_access" ON public.workflows;
CREATE POLICY "admin_owner_full_access"
ON public.workflows
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role IN ('Owner', 'Admin', 'Super Admin') OR role ILIKE 'super%admin')
  )
);

-- Note: Other policies for Analyst/Reviewer/Viewer don't need change as they are role-specific.
-- Super Admin should bypass them via the full access policy above.
