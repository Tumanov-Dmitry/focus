-- A task may span a date range. Existing due_date/due_time remain the range
-- end so current queries and clients continue to work during rollout.
alter table public.tasks
  add column start_date date,
  add column start_time time without time zone;

-- Existing dated tasks become single-day ranges. New columns stay nullable so
-- the migration remains compatible with the currently deployed client.
update public.tasks
set start_date = due_date
where start_date is null and due_date is not null;

alter table public.tasks
  add constraint tasks_start_time_requires_date
    check (start_time is null or start_date is not null),
  add constraint tasks_schedule_dates_order
    check (
      start_date is null
      or due_date is null
      or start_date <= due_date
    ),
  add constraint tasks_schedule_times_order
    check (
      start_date is null
      or due_date is null
      or start_date <> due_date
      or start_time is null
      or due_time is null
      or start_time <= due_time
    );

create index tasks_space_start_idx
  on public.tasks(space_id, start_date)
  where deleted_at is null;
