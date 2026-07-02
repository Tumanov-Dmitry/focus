-- Task satellite tables: assignees, checklist, links, time tracking,
-- comments, and an append-only activity log.

-- SECURITY DEFINER helpers must live outside the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter function public.is_space_member(uuid) set schema private;
alter function public.ensure_personal_space(uuid) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.seed_default_statuses() set schema private;

alter function private.is_space_member(uuid) set search_path = '';
alter function private.ensure_personal_space(uuid) set search_path = '';
alter function private.handle_new_user() set search_path = '';
alter function private.seed_default_statuses() set search_path = '';

-- The original trigger function called its helper through public. Recreate it
-- after moving both functions so future signups keep working.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_personal_space(new.id);
  return new;
end;
$$;

revoke all on function private.is_space_member(uuid) from public, anon, authenticated, service_role;
revoke all on function private.ensure_personal_space(uuid) from public, anon, authenticated, service_role;
revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function private.seed_default_statuses() from public, anon, authenticated, service_role;

-- RLS expressions execute as the querying role. Expose only the membership
-- predicate required by those policies; the provisioning helpers stay private.
grant usage on schema private to authenticated;
grant execute on function private.is_space_member(uuid) to authenticated;

alter policy "read member spaces" on public.spaces
  using ((select private.is_space_member(id)));
alter policy "read own memberships" on public.space_members
  using ((select private.is_space_member(space_id)));

alter policy "read space statuses" on public.statuses
  using ((select private.is_space_member(space_id)));
alter policy "member creates status" on public.statuses
  with check ((select private.is_space_member(space_id)));
alter policy "member updates status" on public.statuses
  using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));
alter policy "member deletes status" on public.statuses
  using ((select private.is_space_member(space_id)));

alter policy "read space projects" on public.projects
  using ((select private.is_space_member(space_id)));
alter policy "member creates project" on public.projects
  with check ((select private.is_space_member(space_id)) and created_by = (select auth.uid()));
alter policy "member updates project" on public.projects
  using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));
alter policy "member deletes project" on public.projects
  using ((select private.is_space_member(space_id)));

alter policy "read space tasks" on public.tasks
  using ((select private.is_space_member(space_id)));
alter policy "member creates task" on public.tasks
  with check ((select private.is_space_member(space_id)) and created_by = (select auth.uid()));
alter policy "member updates task" on public.tasks
  using ((select private.is_space_member(space_id)))
  with check ((select private.is_space_member(space_id)));
alter policy "member deletes task" on public.tasks
  using ((select private.is_space_member(space_id)));

-- Keep one personal space per account and reject references that cross spaces.
create unique index one_personal_space_per_owner
  on public.spaces(owner_id) where kind = 'personal';
create index spaces_owner_idx on public.spaces(owner_id);
create index projects_created_by_idx on public.projects(created_by);
create index tasks_created_by_idx on public.tasks(created_by);
create index tasks_status_idx on public.tasks(status_id);

alter table public.tasks
  add constraint tasks_estimate_nonnegative
  check (estimate_minutes is null or estimate_minutes >= 0),
  add constraint tasks_due_time_requires_date
  check (due_time is null or due_date is not null);

create or replace function private.validate_task_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is not null and not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.space_id = new.space_id
  ) then
    raise exception 'Project must belong to the task space';
  end if;

  if new.status_id is not null and not exists (
    select 1 from public.statuses s
    where s.id = new.status_id and s.space_id = new.space_id
  ) then
    raise exception 'Status must belong to the task space';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_task_references() from public, anon, authenticated, service_role;

create trigger validate_task_references
  before insert or update of space_id, project_id, status_id on public.tasks
  for each row execute function private.validate_task_references();

create or replace function private.protect_task_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_by <> old.created_by or new.space_id <> old.space_id then
    raise exception 'Task creator and space are immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_task_identity() from public, anon, authenticated, service_role;

create trigger protect_task_identity
  before update of created_by, space_id on public.tasks
  for each row execute function private.protect_task_identity();

create or replace function private.protect_project_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_by <> old.created_by or new.space_id <> old.space_id then
    raise exception 'Project creator and space are immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_project_identity() from public, anon, authenticated, service_role;

create trigger protect_project_identity
  before update of created_by, space_id on public.projects
  for each row execute function private.protect_project_identity();

-- Access helper used by satellite RLS without recursively evaluating tasks RLS.
create or replace function private.can_access_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    join public.space_members m on m.space_id = t.space_id
    where t.id = p_task_id and m.user_id = auth.uid()
  );
$$;

revoke all on function private.can_access_task(uuid) from public, anon, authenticated, service_role;
grant execute on function private.can_access_task(uuid) to authenticated;

-- Assignees (m2m) are available only in team spaces.
create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index task_assignees_user_idx on public.task_assignees(user_id);
alter table public.task_assignees enable row level security;
create policy "read task assignees" on public.task_assignees for select to authenticated
  using ((select private.can_access_task(task_id)));
create policy "manage task assignees" on public.task_assignees for all to authenticated
  using ((select private.can_access_task(task_id)))
  with check ((select private.can_access_task(task_id)));

create or replace function private.validate_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.tasks t
    join public.spaces s on s.id = t.space_id and s.kind = 'team'
    join public.space_members m on m.space_id = s.id and m.user_id = new.user_id
    where t.id = new.task_id
  ) then
    raise exception 'Assignees are available only to team-space members';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_task_assignee() from public, anon, authenticated, service_role;

create trigger validate_task_assignee
  before insert or update on public.task_assignees
  for each row execute function private.validate_task_assignee();

-- Flat checklist.
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  content text not null,
  is_done boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checklist_items_task_pos_idx on public.checklist_items(task_id, position);
alter table public.checklist_items enable row level security;
create policy "read checklist" on public.checklist_items for select to authenticated
  using ((select private.can_access_task(task_id)));
create policy "manage checklist" on public.checklist_items for all to authenticated
  using ((select private.can_access_task(task_id)))
  with check ((select private.can_access_task(task_id)));
create trigger set_checklist_items_updated_at before update on public.checklist_items
  for each row execute function public.set_updated_at();

-- Links (multiple per task).
create table public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  url text not null,
  title text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);
create index task_links_task_pos_idx on public.task_links(task_id, position);
alter table public.task_links enable row level security;
create policy "read links" on public.task_links for select to authenticated
  using ((select private.can_access_task(task_id)));
create policy "manage links" on public.task_links for all to authenticated
  using ((select private.can_access_task(task_id)))
  with check ((select private.can_access_task(task_id)));

-- Time tracking. One active timer per user is enforced by a partial unique index.
create type public.time_entry_source as enum ('timer', 'manual');
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes integer not null default 0,
  source public.time_entry_source not null default 'timer',
  created_at timestamptz not null default now(),
  constraint time_entries_minutes_nonnegative check (minutes >= 0),
  constraint time_entries_valid_range check (ended_at is null or ended_at >= started_at),
  constraint manual_time_entries_are_closed
    check (source <> 'manual' or (ended_at is not null and minutes > 0))
);
create index time_entries_task_idx on public.time_entries(task_id);
create index time_entries_user_idx on public.time_entries(user_id);
create unique index one_active_timer_per_user
  on public.time_entries(user_id) where ended_at is null and source = 'timer';
alter table public.time_entries enable row level security;
create policy "read time entries" on public.time_entries for select to authenticated
  using ((select private.can_access_task(task_id)));
create policy "manage own time entries" on public.time_entries for all to authenticated
  using ((select private.can_access_task(task_id)) and user_id = (select auth.uid()))
  with check ((select private.can_access_task(task_id)) and user_id = (select auth.uid()));

-- Comments.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index comments_task_idx on public.comments(task_id, created_at);
create index comments_author_idx on public.comments(author_id);
alter table public.comments enable row level security;
create policy "read comments" on public.comments for select to authenticated
  using ((select private.can_access_task(task_id)));
create policy "create own comment" on public.comments for insert to authenticated
  with check ((select private.can_access_task(task_id)) and author_id = (select auth.uid()));
create policy "modify own comment" on public.comments for update to authenticated
  using ((select private.can_access_task(task_id)) and author_id = (select auth.uid()))
  with check ((select private.can_access_task(task_id)) and author_id = (select auth.uid()));
create policy "delete own comment" on public.comments for delete to authenticated
  using ((select private.can_access_task(task_id)) and author_id = (select auth.uid()));

-- Append-only activity log.
create type public.activity_action as enum (
  'created',
  'updated',
  'completed',
  'uncompleted',
  'rescheduled',
  'status_changed',
  'priority_changed',
  'assigned',
  'commented',
  'timer_started',
  'timer_stopped',
  'duplicated',
  'trashed',
  'restored'
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action public.activity_action not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_entity_idx on public.activity_log(entity_type, entity_id, created_at desc);
create index activity_log_space_idx on public.activity_log(space_id, created_at desc);
create index activity_log_actor_idx on public.activity_log(actor_id);
alter table public.activity_log enable row level security;
create policy "read space activity" on public.activity_log for select to authenticated
  using ((select private.is_space_member(space_id)));
create policy "append activity" on public.activity_log for insert to authenticated
  with check ((select private.is_space_member(space_id)) and actor_id = (select auth.uid()));

-- Explicit Data API exposure. RLS remains the row-level authorization boundary.
revoke all on table
  public.spaces,
  public.space_members,
  public.statuses,
  public.projects,
  public.tasks,
  public.task_assignees,
  public.checklist_items,
  public.task_links,
  public.time_entries,
  public.comments,
  public.activity_log
from anon;

grant select, insert, update, delete on table
  public.spaces,
  public.space_members,
  public.statuses,
  public.projects,
  public.tasks,
  public.task_assignees,
  public.checklist_items,
  public.task_links,
  public.time_entries,
  public.comments
to authenticated;

grant select, insert on table public.activity_log to authenticated;
