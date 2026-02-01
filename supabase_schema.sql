-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tenants Table
create table if not exists tenants (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  slug text not null unique,
  subscription_plan text default 'free'
);

-- Profiles Table (Extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text,
  full_name text,
  tenant_id uuid references tenants on delete cascade,
  role text default 'tenant'
);

-- Workflows Table
create table if not exists workflows (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  tenant_id uuid references tenants on delete cascade not null,
  nodes jsonb default '[]'::jsonb,
  edges jsonb default '[]'::jsonb,
  is_published boolean default false,
  created_by uuid references auth.users
);

-- Helper to check if user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- RLS Policies Update

-- Tenants: Admins can do anything, Users view their own
alter table tenants enable row level security;

drop policy if exists "Users can view their own tenant" on tenants;
create policy "Users can view their own tenant" on tenants
  for select using (
    id = get_auth_tenant_id() or is_admin()
  );

drop policy if exists "Users can create tenants" on tenants;
create policy "Users can create tenants" on tenants
  for insert with check (
    auth.role() = 'authenticated'
  );

drop policy if exists "Admins can manage all tenants" on tenants;
create policy "Admins can manage all tenants" on tenants
  for all using (is_admin());

-- Profiles: Admins manage all, Users view same tenant
alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles
  for select using (
    auth.uid() = id or is_admin()
  );

drop policy if exists "Users can view profiles in same tenant" on profiles;
create policy "Users can view profiles in same tenant" on profiles
  for select using (
    tenant_id = get_auth_tenant_id() or is_admin()
  );

drop policy if exists "Admins can manage all profiles" on profiles;
create policy "Admins can manage all profiles" on profiles
  for all using (is_admin());

-- Workflows: Admins manage all, Users view/edit in same tenant
alter table workflows enable row level security;

drop policy if exists "Users can view workflows in same tenant" on workflows;
create policy "Users can view workflows in same tenant" on workflows
  for select using (
    tenant_id = get_auth_tenant_id() or is_admin()
  );

drop policy if exists "Users can insert workflows in same tenant" on workflows;
create policy "Users can insert workflows in same tenant" on workflows
  for insert with check (
    tenant_id = get_auth_tenant_id() or is_admin()
  );

drop policy if exists "Users can update workflows in same tenant" on workflows;
create policy "Users can update workflows in same tenant" on workflows
  for update using (
    tenant_id = get_auth_tenant_id() or is_admin()
  );

drop policy if exists "Users can delete workflows in same tenant" on workflows;
create policy "Users can delete workflows in same tenant" on workflows
  for delete using (
    tenant_id = get_auth_tenant_id() or is_admin()
  );

drop policy if exists "Admins can manage all workflows" on workflows;
create policy "Admins can manage all workflows" on workflows
  for all using (is_admin());

-- Helper function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC: Create Tenant and Link Profile Transactionally (Bypasses RLS)
create or replace function create_tenant_and_link_profile(
  org_name text,
  org_slug text,
  user_full_name text
) 
returns json
language plpgsql
security definer
as $$
declare
  new_tenant_id uuid;
  result json;
begin
  -- 1. Insert Tenant
  insert into tenants (name, slug, subscription_plan)
  values (org_name, org_slug, 'free')
  returning id into new_tenant_id;

  -- 2. Upsert User Profile (Handles cases where profile is missing)
  insert into profiles (id, tenant_id, role, full_name)
  values (auth.uid(), new_tenant_id, 'owner', user_full_name)
  on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      role = excluded.role,
      full_name = coalesce(excluded.full_name, profiles.full_name);

  -- 3. Return result
  select json_build_object(
    'tenant_id', new_tenant_id,
    'status', 'success'
  ) into result;

  return result;
end;
$$;

-- Updated Helper function to handle new user signup
-- Direct and simple: whenever a user is created in auth.users, create a profile.
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  );
  return new;
end;
$$ language plpgsql security definer;

-- RPC: Create Org and Return ID (Admin Helper)
-- This allows the admin to ensure an org exists before creating the user via Auth API
create or replace function admin_create_org_link(
  target_org_name text
)
returns uuid
language plpgsql
security definer
as $$
declare
  target_tenant_id uuid;
begin
  -- 1. Check if org exists, if not create it
  select id into target_tenant_id from tenants where name = target_org_name limit 1;
  
  if target_tenant_id is null then
    insert into tenants (name, slug)
    values (target_org_name, lower(regexp_replace(target_org_name, '[^a-zA-Z0-9]', '-', 'g')))
    returning id into target_tenant_id;
  end if;

  return target_tenant_id;
end;
$$;

