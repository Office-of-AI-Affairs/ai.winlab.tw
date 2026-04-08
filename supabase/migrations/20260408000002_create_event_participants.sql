create table public.event_participants (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

-- RLS
alter table public.event_participants enable row level security;

-- Public read
create policy "event_participants_select" on public.event_participants
  for select using (true);

-- Admin insert
create policy "event_participants_insert" on public.event_participants
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admin delete
create policy "event_participants_delete" on public.event_participants
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
