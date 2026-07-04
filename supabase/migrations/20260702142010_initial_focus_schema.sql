-- Initial Focus MVP schema for Supabase Cloud.
-- This keeps auth simple: data is owned by auth.users and protected with basic RLS.

create extension if not exists "pgcrypto";

create type public.task_status as enum ('open', 'done', 'archived');
create type public.task_energy as enum ('low', 'medium', 'high');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  notes text,
  status public.task_status not null default 'open',
  energy public.task_energy not null default 'medium',
  due_on date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger set_library_items_updated_at
before update on public.library_items
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.library_items enable row level security;

create policy "Users can read own projects"
on public.projects for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can create own projects"
on public.projects for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own projects"
on public.projects for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own projects"
on public.projects for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Users can read own tasks"
on public.tasks for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can create own tasks"
on public.tasks for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own tasks"
on public.tasks for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own tasks"
on public.tasks for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Users can read own library items"
on public.library_items for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can create own library items"
on public.library_items for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own library items"
on public.library_items for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own library items"
on public.library_items for delete
to authenticated
using (auth.uid() = owner_id);

create index tasks_owner_due_status_idx on public.tasks(owner_id, due_on, status);
create index tasks_owner_sort_idx on public.tasks(owner_id, sort_order, created_at);
create index projects_owner_name_idx on public.projects(owner_id, name);
create index library_items_owner_created_idx on public.library_items(owner_id, created_at desc);
