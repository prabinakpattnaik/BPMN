-- Function to get dashboard stats for a tenant
-- Accesses auth.users to get accurate last_sign_in_at for "Active Users"
-- Returns a JSON object with all counts to minimize round trips

CREATE OR REPLACE FUNCTION get_owner_dashboard_stats(target_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Required to access auth.users
AS $$
DECLARE
    total_users bigint;
    active_users bigint;
    total_workflows bigint;
    published_workflows bigint;
BEGIN
    -- Check if the requesting user belongs to the tenant (RLS-like check)
    IF (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) != target_tenant_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Total Users
    SELECT count(*) INTO total_users
    FROM public.profiles
    WHERE tenant_id = target_tenant_id;

    -- Active Users (logged in last 30 days)
    SELECT count(*) INTO active_users
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE p.tenant_id = target_tenant_id
    AND u.last_sign_in_at > (now() - interval '30 days');

    -- Total Workflows
    SELECT count(*) INTO total_workflows
    FROM public.workflows
    WHERE tenant_id = target_tenant_id;

    -- Published Workflows
    SELECT count(*) INTO published_workflows
    FROM public.workflows
    WHERE tenant_id = target_tenant_id
    AND is_published = true;

    RETURN json_build_object(
        'total_users', total_users,
        'active_users', active_users,
        'total_workflows', total_workflows,
        'published_workflows', published_workflows
    );
END;
$$;
