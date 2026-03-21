create table if not exists public.public_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text
);

drop trigger if exists public_profiles_updated_at on public.public_profiles;
create trigger public_profiles_updated_at
  before update on public.public_profiles
  for each row execute function public.set_updated_at();

insert into public.public_profiles (id, created_at, updated_at, display_name)
select id, created_at, updated_at, display_name
from public.profiles
on conflict (id) do update
set
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  display_name = excluded.display_name;

create or replace function public.sync_public_profile_from_profile()
returns trigger
language plpgsql
as $$
begin
  insert into public.public_profiles (id, created_at, updated_at, display_name)
  values (new.id, new.created_at, new.updated_at, new.display_name)
  on conflict (id) do update
  set
    updated_at = new.updated_at,
    display_name = new.display_name;

  return new;
end;
$$;

drop trigger if exists sync_public_profile_from_profile on public.profiles;
create trigger sync_public_profile_from_profile
  after insert or update of display_name, updated_at on public.profiles
  for each row execute function public.sync_public_profile_from_profile();

alter table public.public_profiles enable row level security;

drop policy if exists "Anyone can read public_profiles" on public.public_profiles;
create policy "Anyone can read public_profiles"
  on public.public_profiles for select
  using (true);

drop policy if exists "Anyone can read profiles" on public.profiles;

create table if not exists public.competition_private_details (
  competition_id uuid primary key references public.competitions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  positions jsonb,
  application_method jsonb,
  contact jsonb,
  required_documents text
);

drop trigger if exists competition_private_details_updated_at on public.competition_private_details;
create trigger competition_private_details_updated_at
  before update on public.competition_private_details
  for each row execute function public.set_updated_at();

insert into public.competition_private_details (
  competition_id,
  created_at,
  updated_at,
  positions,
  application_method,
  contact,
  required_documents
)
select
  id,
  created_at,
  updated_at,
  positions,
  application_method,
  contact,
  required_documents
from public.competitions
on conflict (competition_id) do update
set
  updated_at = excluded.updated_at,
  positions = excluded.positions,
  application_method = excluded.application_method,
  contact = excluded.contact,
  required_documents = excluded.required_documents;

alter table public.competitions
  drop column if exists positions,
  drop column if exists application_method,
  drop column if exists contact,
  drop column if exists required_documents;

alter table public.competition_private_details enable row level security;

drop policy if exists "Authenticated can read competition_private_details" on public.competition_private_details;
create policy "Authenticated can read competition_private_details"
  on public.competition_private_details for select
  to authenticated
  using (true);

drop policy if exists "Admin can insert competition_private_details" on public.competition_private_details;
create policy "Admin can insert competition_private_details"
  on public.competition_private_details for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

drop policy if exists "Admin can update competition_private_details" on public.competition_private_details;
create policy "Admin can update competition_private_details"
  on public.competition_private_details for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

drop policy if exists "Admin can delete competition_private_details" on public.competition_private_details;
create policy "Admin can delete competition_private_details"
  on public.competition_private_details for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );
