-- RPC to allow Owners to update profiles within their tenant
CREATE OR REPLACE FUNCTION owner_update_profile(
    target_user_id uuid,
    new_full_name text,
    new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req_tenant_id uuid;
    req_role text;
    target_tenant_id uuid;
BEGIN
    SELECT tenant_id, role INTO req_tenant_id, req_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF req_role != 'Owner' THEN
        RAISE EXCEPTION 'Only Owners can manage users.';
    END IF;

    SELECT tenant_id INTO target_tenant_id
    FROM public.profiles
    WHERE id = target_user_id;

    -- Target must either belong to the same tenant OR have no tenant (new user)
    IF target_tenant_id IS NOT NULL AND target_tenant_id != req_tenant_id THEN
        RAISE EXCEPTION 'Cannot manage users from other organizations.';
    END IF;

    UPDATE public.profiles
    SET 
        full_name = new_full_name,
        role = new_role,
        tenant_id = req_tenant_id
    WHERE id = target_user_id;

    RETURN true;
END;
$$;

-- RPC to allow Owners to delete users from their tenant
CREATE OR REPLACE FUNCTION owner_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req_tenant_id uuid;
    req_role text;
    target_tenant_id uuid;
BEGIN
    SELECT tenant_id, role INTO req_tenant_id, req_role FROM profiles WHERE id = auth.uid();
    IF req_role != 'Owner' THEN RAISE EXCEPTION 'Access denied'; END IF;

    SELECT tenant_id INTO target_tenant_id FROM profiles WHERE id = target_user_id;

    IF target_tenant_id != req_tenant_id THEN RAISE EXCEPTION 'Cannot delete users from other tenants'; END IF;
    
    DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$;
