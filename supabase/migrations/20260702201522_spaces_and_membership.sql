-- Spaces (personal now, team later) + membership + auto personal space.
-- RLS across the app is scoped by space membership via is_space_member().

create type public.space_kind as enum ('personal', 'team');
create type public.space_role as enum ('owner', 'member');

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.space_kind not null default 'personal',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.space_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create index space_members_user_idx on public.space_members(user_id);

-- Membership check used by RLS everywhere. SECURITY DEFINER to read
-- space_members without recursive RLS evaluation.
create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.space_members m
    where m.space_id = p_space_id and m.user_id = auth.uid()
  );
$$;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;

create policy "read member spaces" on public.spaces for select to authenticated
  using (public.is_space_member(id));
create policy "create own space" on public.spaces for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owner updates space" on public.spaces for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes team space" on public.spaces for delete to authenticated
  using (owner_id = auth.uid() and kind = 'team');

create policy "read own memberships" on public.space_members for select to authenticated
  using (public.is_space_member(space_id));
create policy "space owner manages members" on public.space_members for all to authenticated
  using (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));

create trigger set_spaces_updated_at before update on public.spaces
  for each row execute function public.set_updated_at();

-- Create a personal space + owner membership for a user (idempotent).
create or replace function public.ensure_personal_space(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_id uuid;
begin
  select id into v_space_id from public.spaces
   where owner_id = p_user and kind = 'personal' limit 1;
  if v_space_id is null then
    insert into public.spaces (name, kind, owner_id)
      values ('Личное', 'personal', p_user)
      returning id into v_space_id;
    insert into public.space_members (space_id, user_id, role)
      values (v_space_id, p_user, 'owner')
      on conflict do nothing;
  end if;
  return v_space_id;
end;
$$;

-- Auto-provision a personal space on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_personal_space(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill personal spaces for existing users.
do $$
declare r record;
begin
  for r in select id from auth.users loop
    perform public.ensure_personal_space(r.id);
  end loop;
end $$;
