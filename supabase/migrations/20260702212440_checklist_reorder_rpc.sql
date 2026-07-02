-- Reorder a complete checklist atomically. SECURITY INVOKER keeps the caller's
-- RLS boundary; the function only groups the position updates and activity log.
create or replace function public.reorder_checklist_items(
  p_task_id uuid,
  p_item_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing_count integer;
begin
  if p_item_ids is null then
    raise exception 'Checklist order is required';
  end if;

  select count(*)
  into v_existing_count
  from public.checklist_items
  where task_id = p_task_id;

  if v_existing_count <> cardinality(p_item_ids) then
    raise exception 'Checklist order must contain every item';
  end if;

  if (
    select count(distinct input.item_id)
    from unnest(p_item_ids) as input(item_id)
  ) <> cardinality(p_item_ids) then
    raise exception 'Checklist order contains duplicate items';
  end if;

  if exists (
    select 1
    from unnest(p_item_ids) as input(item_id)
    left join public.checklist_items item
      on item.id = input.item_id
      and item.task_id = p_task_id
    where item.id is null
  ) then
    raise exception 'Checklist order contains an invalid item';
  end if;

  update public.checklist_items item
  set
    position = input.ordinality - 1,
    updated_at = now()
  from unnest(p_item_ids) with ordinality as input(item_id, ordinality)
  where item.id = input.item_id
    and item.task_id = p_task_id;

  insert into public.activity_log (
    space_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    payload
  )
  select
    task.space_id,
    auth.uid(),
    'task',
    task.id,
    'updated',
    jsonb_build_object(
      'new',
      jsonb_build_object('checklist_order', to_jsonb(p_item_ids))
    )
  from public.tasks task
  where task.id = p_task_id
    and task.deleted_at is null;

  if not found then
    raise exception 'Task not found';
  end if;
end;
$$;

revoke all on function public.reorder_checklist_items(uuid, uuid[])
  from public, anon, service_role;
grant execute on function public.reorder_checklist_items(uuid, uuid[])
  to authenticated;
