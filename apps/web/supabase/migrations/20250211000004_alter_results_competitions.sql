-- Add type and team_id to results
alter table public.results
  add column if not exists type text not null default 'personal' check (type in ('personal', 'team')),
  add column if not exists team_id uuid references public.teams(id) on delete set null;

-- Add description to competitions
alter table public.competitions
  add column if not exists description text;
