-- Organization members (組織人員: AI新秀, 產學聯盟, 校友)
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category text not null check (category in ('ai_newcomer', 'industry_academy', 'alumni')),
  name text not null,
  summary text,
  image text,
  link text,
  sort_order int not null default 0
);

create trigger organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- RLS: public read; only admin write
alter table public.organization_members enable row level security;

create policy "Anyone can read organization_members"
  on public.organization_members for select
  using (true);

create policy "Admin can insert organization_members"
  on public.organization_members for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin can update organization_members"
  on public.organization_members for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin can delete organization_members"
  on public.organization_members for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
