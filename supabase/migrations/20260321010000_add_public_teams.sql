create table if not exists public.public_teams (
  id uuid primary key references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null
);

drop trigger if exists public_teams_updated_at on public.public_teams;
create trigger public_teams_updated_at
  before update on public.public_teams
  for each row execute function public.set_updated_at();

insert into public.public_teams (id, created_at, updated_at, name)
select id, created_at, updated_at, name
from public.teams
on conflict (id) do update
set
  updated_at = excluded.updated_at,
  name = excluded.name;

create or replace function public.sync_public_team_from_team()
returns trigger
language plpgsql
as $$
begin
  insert into public.public_teams (id, created_at, updated_at, name)
  values (new.id, new.created_at, new.updated_at, new.name)
  on conflict (id) do update
  set
    updated_at = new.updated_at,
    name = new.name;

  return new;
end;
$$;

drop trigger if exists sync_public_team_from_team on public.teams;
create trigger sync_public_team_from_team
  after insert or update of name, updated_at on public.teams
  for each row execute function public.sync_public_team_from_team();

alter table public.public_teams enable row level security;

drop policy if exists "Anyone can read public_teams" on public.public_teams;
create policy "Anyone can read public_teams"
  on public.public_teams for select
  using (true);
