-- Rebuild projects and tasks on the space model per the task spec.
-- The old owner-scoped tables held only disposable test data.

drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop type if exists public.task_status;
drop type if exists public.task_energy;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_space_name_idx on public.projects(space_id, name);

create type public.task_type as enum ('task', 'call', 'meeting');
create type public.task_priority as enum ('none', 'low', 'medium', 'high');
create type public.task_source as enum ('manual', 'inbox');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  type public.task_type not null default 'task',
  description text,
  due_date date,
  due_time time,
  priority public.task_priority not null default 'none',
  status_id uuid references public.statuses(id) on delete set null,
  estimate_minutes integer,
  source public.task_source not null default 'manual',
  completed_at timestamptz,
  deleted_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_space_due_idx on public.tasks(space_id, due_date) where deleted_at is null;
create index tasks_space_created_idx on public.tasks(space_id, created_at desc);
create index tasks_project_idx on public.tasks(project_id);

alter table public.projects enable row level security;
create policy "read space projects" on public.projects for select to authenticated
  using (public.is_space_member(space_id));
create policy "member creates project" on public.projects for insert to authenticated
  with check (public.is_space_member(space_id) and created_by = auth.uid());
create policy "member updates project" on public.projects for update to authenticated
  using (public.is_space_member(space_id)) with check (public.is_space_member(space_id));
create policy "member deletes project" on public.projects for delete to authenticated
  using (public.is_space_member(space_id));

alter table public.tasks enable row level security;
create policy "read space tasks" on public.tasks for select to authenticated
  using (public.is_space_member(space_id));
create policy "member creates task" on public.tasks for insert to authenticated
  with check (public.is_space_member(space_id) and created_by = auth.uid());
create policy "member updates task" on public.tasks for update to authenticated
  using (public.is_space_member(space_id)) with check (public.is_space_member(space_id));
create policy "member deletes task" on public.tasks for delete to authenticated
  using (public.is_space_member(space_id));

create trigger set_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
