create table if not exists public.oauth_clients (
  client_id text primary key,
  client_name text not null,
  redirect_uris jsonb not null,
  grant_types jsonb not null,
  response_types jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.oauth_clients is 'Dynamic OAuth client registrations for MCP clients.';

alter table public.oauth_clients enable row level security;

create policy "anon can insert oauth clients"
on public.oauth_clients
for insert
to anon
with check (
  char_length(client_id) > 0
  and char_length(client_name) > 0
  and jsonb_typeof(redirect_uris) = 'array'
  and jsonb_array_length(redirect_uris) > 0
  and jsonb_typeof(grant_types) = 'array'
  and jsonb_array_length(grant_types) > 0
  and jsonb_typeof(response_types) = 'array'
  and jsonb_array_length(response_types) > 0
);

create policy "anon can read oauth clients"
on public.oauth_clients
for select
to anon
using (true);
