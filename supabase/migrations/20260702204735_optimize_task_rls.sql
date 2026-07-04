-- Avoid evaluating overlapping permissive SELECT policies. Read access stays
-- separate; write access is expressed per command.

drop policy "manage task assignees" on public.task_assignees;
create policy "create task assignee" on public.task_assignees
  for insert to authenticated
  with check ((select private.can_access_task(task_id)));
create policy "update task assignee" on public.task_assignees
  for update to authenticated
  using ((select private.can_access_task(task_id)))
  with check ((select private.can_access_task(task_id)));
create policy "delete task assignee" on public.task_assignees
  for delete to authenticated
  using ((select private.can_access_task(task_id)));

drop policy "manage checklist" on public.checklist_items;
create policy "create checklist item" on public.checklist_items
  for insert to authenticated
  with check ((select private.can_access_task(task_id)));
create policy "update checklist item" on public.checklist_items
  for update to authenticated
  using ((select private.can_access_task(task_id)))
  with check ((select private.can_access_task(task_id)));
create policy "delete checklist item" on public.checklist_items
  for delete to authenticated
  using ((select private.can_access_task(task_id)));

drop policy "manage links" on public.task_links;
create policy "create task link" on public.task_links
  for insert to authenticated
  with check ((select private.can_access_task(task_id)));
create policy "update task link" on public.task_links
  for update to authenticated
  using ((select private.can_access_task(task_id)))
  with check ((select private.can_access_task(task_id)));
create policy "delete task link" on public.task_links
  for delete to authenticated
  using ((select private.can_access_task(task_id)));

drop policy "manage own time entries" on public.time_entries;
create policy "create own time entry" on public.time_entries
  for insert to authenticated
  with check (
    (select private.can_access_task(task_id))
    and user_id = (select auth.uid())
  );
create policy "update own time entry" on public.time_entries
  for update to authenticated
  using (
    (select private.can_access_task(task_id))
    and user_id = (select auth.uid())
  )
  with check (
    (select private.can_access_task(task_id))
    and user_id = (select auth.uid())
  );
create policy "delete own time entry" on public.time_entries
  for delete to authenticated
  using (
    (select private.can_access_task(task_id))
    and user_id = (select auth.uid())
  );

-- Apply the same shape to the membership policy introduced by the spaces
-- migration, and cache auth.uid() once per statement in owner policies.
drop policy "space owner manages members" on public.space_members;
create policy "space owner adds members" on public.space_members
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.spaces s
      where s.id = space_id
        and s.owner_id = (select auth.uid())
    )
  );
create policy "space owner updates members" on public.space_members
  for update to authenticated
  using (
    exists (
      select 1
      from public.spaces s
      where s.id = space_id
        and s.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.spaces s
      where s.id = space_id
        and s.owner_id = (select auth.uid())
    )
  );
create policy "space owner removes members" on public.space_members
  for delete to authenticated
  using (
    exists (
      select 1
      from public.spaces s
      where s.id = space_id
        and s.owner_id = (select auth.uid())
    )
  );

alter policy "create own space" on public.spaces
  with check (owner_id = (select auth.uid()));
alter policy "owner updates space" on public.spaces
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
alter policy "owner deletes team space" on public.spaces
  using (owner_id = (select auth.uid()) and kind = 'team');
