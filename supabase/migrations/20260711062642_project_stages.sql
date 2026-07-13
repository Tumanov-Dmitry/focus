-- ТЗ №2, шаг 1: этапы проектов + статус проекта + контекст наборов статусов.
-- Переиспользуем уже существующее (projects_core): statuses.category как
-- системную категорию, projects.end_date/amount/lifecycle. activity_log.entity_type
-- — text, новые значения ('project', 'project_stage') пишутся без миграции.

-- 1. Контекст набора статусов: 'task' — канбан задач, 'project' — статус проекта.
--    Существующие статусы (и space-level, и пер-проектные) остаются задачными.
alter table public.statuses
  add column context text not null default 'task'
    check (context in ('task', 'project'));

-- 2. Статус самого проекта — из набора context='project'.
alter table public.projects
  add column status_id uuid references public.statuses(id) on delete set null;

-- 3. Сид набора context='project' (space-level, project_id null) для текущих пространств.
do $$
declare sp record;
begin
  for sp in select id from public.spaces loop
    if not exists (
      select 1 from public.statuses s
      where s.space_id = sp.id and s.project_id is null and s.context = 'project'
    ) then
      insert into public.statuses (space_id, name, color, category, position, context) values
        (sp.id, 'Ту-ду',    '#6b7280', 'not_started', 0, 'project'),
        (sp.id, 'В работе', '#3b82f6', 'in_progress', 1, 'project'),
        (sp.id, 'Ждём ОС',  '#f59e0b', 'in_progress', 2, 'project'),
        (sp.id, 'Готово',   '#22c55e', 'done',        3, 'project');
    end if;
  end loop;
end $$;

-- 4. Новые пространства сеются обоими наборами (task + project).
create or replace function private.seed_default_statuses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.statuses (space_id, name, color, category, position, context) values
    (new.id, 'Ту-ду',    '#6b7280', 'not_started', 0, 'task'),
    (new.id, 'В работе', '#3b82f6', 'in_progress', 1, 'task'),
    (new.id, 'Ждём ОС',  '#f59e0b', 'in_progress', 2, 'task'),
    (new.id, 'Готово',   '#22c55e', 'done',        3, 'task'),
    (new.id, 'Ту-ду',    '#6b7280', 'not_started', 0, 'project'),
    (new.id, 'В работе', '#3b82f6', 'in_progress', 1, 'project'),
    (new.id, 'Ждём ОС',  '#f59e0b', 'in_progress', 2, 'project'),
    (new.id, 'Готово',   '#22c55e', 'done',        3, 'project');
  return new;
end;
$$;

-- 5. Этапы проекта.
create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  due_date date,
  status_id uuid references public.statuses(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_stages_project_position_idx on public.project_stages(project_id, position);

alter table public.project_stages enable row level security;

create policy "read project stages" on public.project_stages for select to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and private.is_space_member(p.space_id)));
create policy "member creates project stage" on public.project_stages for insert to authenticated
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and private.is_space_member(p.space_id)));
create policy "member updates project stage" on public.project_stages for update to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and private.is_space_member(p.space_id)))
  with check (exists (select 1 from public.projects p
                      where p.id = project_id and private.is_space_member(p.space_id)));
create policy "member deletes project stage" on public.project_stages for delete to authenticated
  using (exists (select 1 from public.projects p
                 where p.id = project_id and private.is_space_member(p.space_id)));

create trigger set_project_stages_updated_at before update on public.project_stages
  for each row execute function public.set_updated_at();
