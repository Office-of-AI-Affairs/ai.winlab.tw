drop policy if exists "allow_insert" on public.oauth_auth_codes;
drop policy if exists "allow_select" on public.oauth_auth_codes;
drop policy if exists "allow_delete" on public.oauth_auth_codes;

drop function if exists public.create_oauth_auth_code(text, jsonb);
create function public.create_oauth_auth_code(p_code text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.oauth_auth_codes (code, data)
  values (p_code, p_data);
end;
$$;

drop function if exists public.exchange_oauth_auth_code(text);
create function public.exchange_oauth_auth_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
begin
  delete from public.oauth_auth_codes
  where code = p_code
    and expires_at >= now()
  returning data into v_data;

  if v_data is not null then
    return v_data;
  end if;

  delete from public.oauth_auth_codes
  where code = p_code;

  return null;
end;
$$;

revoke all on function public.create_oauth_auth_code(text, jsonb) from public;
revoke all on function public.exchange_oauth_auth_code(text) from public;
grant execute on function public.create_oauth_auth_code(text, jsonb) to anon, authenticated;
grant execute on function public.exchange_oauth_auth_code(text) to anon, authenticated;

drop policy if exists "allow_insert" on public.upload_tokens;
drop policy if exists "allow_select" on public.upload_tokens;
drop policy if exists "allow_update" on public.upload_tokens;

drop function if exists public.consume_upload_token(text);
create function public.consume_upload_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.upload_tokens%rowtype;
begin
  update public.upload_tokens
  set used = true
  where token = p_token
    and used = false
    and expires_at >= now()
  returning * into v_row;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'user_id', v_row.user_id,
    'category', v_row.category,
    'access_token', v_row.access_token
  );
end;
$$;

revoke all on function public.consume_upload_token(text) from public;
grant execute on function public.consume_upload_token(text) to anon, authenticated;

drop policy if exists "Authenticated users can create own upload tokens" on public.upload_tokens;
create policy "Authenticated users can create own upload tokens"
on public.upload_tokens
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated read all announcements" on public.announcements;
drop policy if exists "Authenticated read published or admin announcements" on public.announcements;
create policy "Authenticated read published or admin announcements"
on public.announcements
for select
to authenticated
using (
  status = 'published'
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Authenticated read all events" on public.events;
drop policy if exists "Authenticated read published or admin events" on public.events;
create policy "Authenticated read published or admin events"
on public.events
for select
to authenticated
using (
  status = 'published'
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

drop policy if exists "Authenticated read all results" on public.results;
drop policy if exists "Authenticated read own, led-team, published, or admin results" on public.results;
create policy "Authenticated read own, led-team, published, or admin results"
on public.results
for select
to authenticated
using (
  status = 'published'
  or author_id = (select auth.uid())
  or (
    type = 'team'
    and team_id is not null
    and public.is_team_leader(team_id, (select auth.uid()))
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);
