-- Custom task statuses per space. Status is a label only (no automations).
-- 3 defaults are seeded on space creation.

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index statuses_space_position_idx on public.statuses(space_id, position);

alter table public.statuses enable row level security;

create policy "read space statuses" on public.statuses for select to authenticated
  using (public.is_space_member(space_id));
create policy "member creates status" on public.statuses for insert to authenticated
  with check (public.is_space_member(space_id));
create policy "member updates status" on public.statuses for update to authenticated
  using (public.is_space_member(space_id)) with check (public.is_space_member(space_id));
create policy "member deletes status" on public.statuses for delete to authenticated
  using (public.is_space_member(space_id));

create trigger set_statuses_updated_at before update on public.statuses
  for each row execute function public.set_updated_at();

create or replace function public.seed_default_statuses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.statuses (space_id, name, color, position) values
    (new.id, 'В работе', '#3b82f6', 0),
    (new.id, 'Ждёт',     '#f59e0b', 1),
    (new.id, 'На паузе', '#6b7280', 2);
  return new;
end;
$$;

create trigger seed_statuses_on_space after insert on public.spaces
  for each row execute function public.seed_default_statuses();

do $$
declare r record;
begin
  for r in select id from public.spaces sp
           where not exists (select 1 from public.statuses st where st.space_id = sp.id) loop
    insert into public.statuses (space_id, name, color, position) values
      (r.id, 'В работе', '#3b82f6', 0),
      (r.id, 'Ждёт',     '#f59e0b', 1),
      (r.id, 'На паузе', '#6b7280', 2);
  end loop;
end $$;
