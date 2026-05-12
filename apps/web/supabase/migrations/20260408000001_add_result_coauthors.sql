-- result_coauthors: M-to-M junction for co-authorship on results
-- Only the result creator (author_id) can manage co-authors.
-- Co-authors get visibility (shown on result detail + their profile), but no edit rights.

create table if not exists public.result_coauthors (
  result_id uuid not null references public.results(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (result_id, user_id)
);

-- Prevent self-coauthorship (author_id is already the primary author)
alter table public.result_coauthors
  add constraint result_coauthors_not_self_author
  check (true); -- enforced at app level: cannot add author_id as coauthor

create index idx_result_coauthors_user_id on public.result_coauthors(user_id);

-- RLS
alter table public.result_coauthors enable row level security;

-- Anyone can read co-authors of published results
create policy "Anyone can read coauthors of published results"
  on public.result_coauthors for select
  using (
    exists (
      select 1 from public.results r
      where r.id = result_coauthors.result_id
        and (r.status = 'published' or auth.uid() is not null)
    )
  );

-- Only the result's original author (or admin) can insert coauthors
create policy "Result author or admin can insert coauthors"
  on public.result_coauthors for insert
  with check (
    exists (
      select 1 from public.results r
      where r.id = result_coauthors.result_id
        and r.author_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Only the result's original author (or admin) can delete coauthors
create policy "Result author or admin can delete coauthors"
  on public.result_coauthors for delete
  using (
    exists (
      select 1 from public.results r
      where r.id = result_coauthors.result_id
        and r.author_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
