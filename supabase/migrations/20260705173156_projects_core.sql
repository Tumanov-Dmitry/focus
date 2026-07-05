-- ТЗ №2: projects core — lifecycle/dates/amount + per-project statuses with categories.

alter table public.projects
  add column start_date date,
  add column end_date date,
  add column lifecycle text not null default 'active'
    check (lifecycle in ('active', 'completed', 'archived')),
  add column amount numeric(12,2),
  add constraint projects_dates_order
    check (start_date is null or end_date is null or start_date <= end_date);

-- Per-project scoping + system category. Reuse existing "position" for ordering.
alter table public.statuses
  add column project_id uuid references public.projects(id) on delete cascade,
  add column category text not null default 'in_progress'
    check (category in ('not_started', 'in_progress', 'done'));

create index statuses_project_idx on public.statuses(project_id);
create index statuses_space_project_pos_idx on public.statuses(space_id, project_id, position);

-- Ensure each space default set has a not_started and a done status.
do $$
declare sp record;
begin
  for sp in select id from public.spaces loop
    if not exists (select 1 from public.statuses s
                   where s.space_id = sp.id and s.project_id is null and s.category = 'not_started') then
      insert into public.statuses (space_id, name, color, category, position)
      select sp.id, 'Ту-ду', '#6b7280', 'not_started',
             coalesce((select max(position) from public.statuses
                       where space_id = sp.id and project_id is null), -1) + 1;
    end if;
    if not exists (select 1 from public.statuses s
                   where s.space_id = sp.id and s.project_id is null and s.category = 'done') then
      insert into public.statuses (space_id, name, color, category, position)
      select sp.id, 'Готово', '#22c55e', 'done',
             coalesce((select max(position) from public.statuses
                       where space_id = sp.id and project_id is null), -1) + 1;
    end if;
  end loop;
end $$;

-- New spaces seed the standard набор with categories.
create or replace function private.seed_default_statuses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.statuses (space_id, name, color, category, position) values
    (new.id, 'Ту-ду',    '#6b7280', 'not_started', 0),
    (new.id, 'В работе', '#3b82f6', 'in_progress', 1),
    (new.id, 'Ждём ОС',  '#f59e0b', 'in_progress', 2),
    (new.id, 'Готово',   '#22c55e', 'done',        3);
  return new;
end;
$$;

-- Create a project and seed its standard status набор atomically.
create or replace function public.create_project_with_statuses(p_space_id uuid, p_name text)
returns public.projects
language plpgsql
security invoker
set search_path = ''
as $$
declare v_project public.projects;
begin
  insert into public.projects (space_id, name, created_by)
    values (p_space_id, p_name, auth.uid())
    returning * into v_project;

  insert into public.statuses (space_id, project_id, name, color, category, position) values
    (p_space_id, v_project.id, 'Ту-ду',    '#6b7280', 'not_started', 0),
    (p_space_id, v_project.id, 'В работе', '#3b82f6', 'in_progress', 1),
    (p_space_id, v_project.id, 'Ждём ОС',  '#f59e0b', 'in_progress', 2),
    (p_space_id, v_project.id, 'Готово',   '#22c55e', 'done',        3);

  return v_project;
end;
$$;
revoke all on function public.create_project_with_statuses(uuid, text) from public, anon, service_role;
grant execute on function public.create_project_with_statuses(uuid, text) to authenticated;

-- Delete a status, reassigning its tasks to a target status, atomically, with activity log.
create or replace function public.delete_status_reassign(p_status_id uuid, p_target_status_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_project_id uuid;
  v_category text;
begin
  select space_id, project_id, category into v_space_id, v_project_id, v_category
  from public.statuses where id = p_status_id;
  if v_space_id is null then
    raise exception 'Status not found';
  end if;

  if v_category = 'done' and (
    select count(*) from public.statuses s2
    where s2.category = 'done' and s2.space_id = v_space_id
      and s2.project_id is not distinct from v_project_id
  ) <= 1 then
    raise exception 'Cannot delete the last done status';
  end if;

  if p_target_status_id is not null then
    insert into public.activity_log (space_id, actor_id, entity_type, entity_id, action, payload)
    select t.space_id, auth.uid(), 'task', t.id, 'status_changed',
           jsonb_build_object('old', jsonb_build_object('status_id', p_status_id),
                              'new', jsonb_build_object('status_id', p_target_status_id))
    from public.tasks t
    where t.status_id = p_status_id;

    update public.tasks set status_id = p_target_status_id where status_id = p_status_id;
  else
    update public.tasks set status_id = null where status_id = p_status_id;
  end if;

  delete from public.statuses where id = p_status_id;
end;
$$;
revoke all on function public.delete_status_reassign(uuid, uuid) from public, anon, service_role;
grant execute on function public.delete_status_reassign(uuid, uuid) to authenticated;
