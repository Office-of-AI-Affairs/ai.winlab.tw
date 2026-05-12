-- RLS for results: public read published; authenticated read all; author/team leader/admin can mutate
alter table public.results enable row level security;

drop policy if exists "Public read published results" on public.results;
create policy "Public read published results"
  on public.results for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Authenticated read all results" on public.results;
create policy "Authenticated read all results"
  on public.results for select
  to authenticated
  using (true);

drop policy if exists "Author can insert result" on public.results;
create policy "Author can insert result"
  on public.results for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (type = 'personal' or (
      type = 'team' and team_id is not null
      and exists (select 1 from public.team_members tm where tm.team_id = results.team_id and tm.user_id = auth.uid() and tm.role = 'leader')
    ))
  );

drop policy if exists "Author or team leader or admin can update result" on public.results;
create policy "Author or team leader or admin can update result"
  on public.results for update
  using (
    author_id = auth.uid()
    or (type = 'team' and team_id is not null and exists (select 1 from public.team_members tm where tm.team_id = results.team_id and tm.user_id = auth.uid() and tm.role = 'leader'))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Author or team leader or admin can delete result" on public.results;
create policy "Author or team leader or admin can delete result"
  on public.results for delete
  using (
    author_id = auth.uid()
    or (type = 'team' and team_id is not null and exists (select 1 from public.team_members tm where tm.team_id = results.team_id and tm.user_id = auth.uid() and tm.role = 'leader'))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- RLS for competitions: public read; admin only write
alter table public.competitions enable row level security;

drop policy if exists "Public read competitions" on public.competitions;
create policy "Public read competitions"
  on public.competitions for select
  using (true);

drop policy if exists "Admin can insert competition" on public.competitions;
create policy "Admin can insert competition"
  on public.competitions for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admin can update competition" on public.competitions;
create policy "Admin can update competition"
  on public.competitions for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admin can delete competition" on public.competitions;
create policy "Admin can delete competition"
  on public.competitions for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
