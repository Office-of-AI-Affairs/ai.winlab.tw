-- Contacts for homepage / contact section
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null default '',
  position text,
  phone text,
  email text,
  sort_order int not null default 0
);

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

-- Everyone can read contacts
create policy "Anyone can read contacts"
  on public.contacts for select
  to anon, authenticated
  using (true);

-- Only admins can insert/update/delete
create policy "Admin can insert contacts"
  on public.contacts for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin can update contacts"
  on public.contacts for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin can delete contacts"
  on public.contacts for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

