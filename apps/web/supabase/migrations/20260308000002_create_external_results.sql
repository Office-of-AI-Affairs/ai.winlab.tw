create table external_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  link text,
  image text
);

alter table external_results enable row level security;

create policy "public read external_results"
  on external_results for select
  using (true);

create policy "owner insert external_results"
  on external_results for insert
  with check (auth.uid() = user_id);

create policy "owner update external_results"
  on external_results for update
  using (auth.uid() = user_id);

create policy "owner delete external_results"
  on external_results for delete
  using (auth.uid() = user_id);

create or replace function update_external_results_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_external_results_updated_at
  before update on external_results
  for each row execute function update_external_results_updated_at();
