-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  leader_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

-- Team members
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Team invitations
create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

-- RLS teams
alter table public.teams enable row level security;

create policy "Team members can read team"
  on public.teams for select
  using (
    exists (select 1 from public.team_members tm where tm.team_id = teams.id and tm.user_id = auth.uid())
  );

create policy "Authenticated can create team"
  on public.teams for insert
  to authenticated
  with check (auth.uid() = leader_id);

create policy "Leader can update team"
  on public.teams for update
  using (leader_id = auth.uid());

create policy "Leader can delete team"
  on public.teams for delete
  using (leader_id = auth.uid());

-- RLS team_members
alter table public.team_members enable row level security;

create policy "Members can read team_members"
  on public.team_members for select
  using (
    exists (select 1 from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid())
  );

create policy "Leader can insert team_members"
  on public.team_members for insert
  with check (
    exists (select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
  );

create policy "Leader can delete team_members"
  on public.team_members for delete
  using (
    exists (select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
  );

-- Members can delete own membership (leave)
create policy "User can leave team"
  on public.team_members for delete
  using (user_id = auth.uid());

-- RLS team_invitations
alter table public.team_invitations enable row level security;

create policy "Invitee or leader can read invitation"
  on public.team_invitations for select
  using (
    invited_by = auth.uid()
    or (auth.jwt() ->> 'email')::text = email
  );

create policy "Leader can insert invitation"
  on public.team_invitations for insert
  with check (
    exists (select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
  );

create policy "Leader or invitee can update invitation"
  on public.team_invitations for update
  using (invited_by = auth.uid() or (auth.jwt() ->> 'email')::text = email);
