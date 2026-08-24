-- Editorial workflow (#47): scheduled publishing, version history, audit
-- log, and a new `editor` profile role. Idempotent where practical — safe
-- to re-run against the same database.
--
-- DO NOT apply via the dashboard policy UI — SQL Editor / migration runner
-- only, same as every other file in this directory.
--
-- Scope, per the issue: announcements get `publish_at` (results/events do
-- not need scheduling — no product need for it there yet). Version history
-- + audit log cover announcements + results (audit log additionally covers
-- events, carousel_slides, organization_members, per the issue). The new
-- `editor` role can create/edit *draft* announcements + results but can
-- never set status='published' or touch an already-published row — that is
-- enforced here in RLS, not just in the UI, so the MCP app (which writes
-- through a user-JWT-bound Supabase client, not service role) inherits the
-- same restriction automatically.

-- ============================================================
-- 1. Scheduled publishing — announcements.publish_at
-- ============================================================

alter table public.announcements
  add column if not exists publish_at timestamptz;

comment on column public.announcements.publish_at is
  'Optional future timestamp. A published row is only "live" for anon/public reads once publish_at has passed (or is null). NULL = live immediately, same as before this column existed.';

create index if not exists idx_announcements_publish_at
  on public.announcements (publish_at)
  where publish_at is not null;

-- ============================================================
-- 2. `editor` profile role
-- ============================================================

alter table public.profiles
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check check (role in ('admin', 'user', 'vendor', 'member', 'editor'));

-- Mirrors public.current_user_is_admin() (20260518000002) — SECURITY
-- DEFINER + hard-coded search_path so it can safely read public.profiles
-- from inside another table's RLS policy without recursing.
create or replace function public.current_user_is_editor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'editor'
  );
$$;

revoke all on function public.current_user_is_editor() from public;
grant execute on function public.current_user_is_editor() to authenticated;

-- ============================================================
-- 3. RLS — announcements (scheduled visibility + editor read/write)
-- ============================================================

drop policy if exists "Anon read published announcements" on public.announcements;
create policy "Anon read published announcements"
  on public.announcements for select to anon
  using (status = 'published' and (publish_at is null or publish_at <= now()));

-- Belt-and-suspenders name change from the old "...or admin announcements"
-- policy it replaces — logic now also covers the publish_at gate and the
-- new editor role. RLS is the actual security boundary here; app-level
-- filters in data.ts etc. mirror this but are not what's actually enforced.
drop policy if exists "Authenticated read all announcements" on public.announcements;
drop policy if exists "Authenticated read published or admin announcements" on public.announcements;
create policy "Authenticated read live, or admin/editor announcements"
  on public.announcements for select to authenticated
  using (
    (status = 'published' and (publish_at is null or publish_at <= now()))
    or public.current_user_is_admin()
    or public.current_user_is_editor()
  );

drop policy if exists "Admin can insert announcement" on public.announcements;
create policy "Admin or editor can insert announcement"
  on public.announcements for insert to authenticated
  with check (
    public.current_user_is_admin()
    or (public.current_user_is_editor() and status = 'draft')
  );

-- Editor may only touch rows that are currently draft (USING, evaluated
-- against the OLD row) and may only leave them as draft (WITH CHECK,
-- evaluated against the NEW row) — cannot set status='published' and
-- cannot edit an already-published row at all.
drop policy if exists "Admin can update announcement" on public.announcements;
create policy "Admin or editor can update announcement"
  on public.announcements for update to authenticated
  using (
    public.current_user_is_admin()
    or (public.current_user_is_editor() and status = 'draft')
  )
  with check (
    public.current_user_is_admin()
    or (public.current_user_is_editor() and status = 'draft')
  );

-- DELETE stays admin-only (public.announcements "Admin can delete
-- announcement", unchanged) — editors do not get delete rights.

-- ============================================================
-- 4. RLS — results (editor read/write, author behavior unchanged)
-- ============================================================

drop policy if exists "Authenticated read own, published, or admin results" on public.results;
create policy "Authenticated read own, published, admin, or editor results"
  on public.results for select to authenticated
  using (
    status = 'published'
    or author_id = (select auth.uid())
    or public.current_user_is_admin()
    or public.current_user_is_editor()
  );

drop policy if exists "Author or admin can insert result" on public.results;
create policy "Author, admin, or editor can insert result"
  on public.results for insert to authenticated
  with check (
    author_id = (select auth.uid())
    or public.current_user_is_admin()
    or (public.current_user_is_editor() and status = 'draft')
  );

drop policy if exists "Author or admin can update result" on public.results;
create policy "Author, admin, or editor can update result"
  on public.results for update to authenticated
  using (
    author_id = (select auth.uid())
    or public.current_user_is_admin()
    or (public.current_user_is_editor() and status = 'draft')
  )
  with check (
    author_id = (select auth.uid())
    or public.current_user_is_admin()
    or (public.current_user_is_editor() and status = 'draft')
  );

-- DELETE stays author-or-admin ("Author or admin can delete result",
-- unchanged) — editors do not get delete rights.

-- ============================================================
-- 5. Version history — content_revisions
-- ============================================================

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  table_name text not null check (table_name in ('announcements', 'results')),
  row_id uuid not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_revisions_row
  on public.content_revisions (table_name, row_id, created_at desc);

alter table public.content_revisions enable row level security;

-- No INSERT/UPDATE/DELETE policy — every row is written by the SECURITY
-- DEFINER trigger below (runs as the table owner, which bypasses RLS by
-- default), never directly by a client.
drop policy if exists "Admin or editor can read content_revisions" on public.content_revisions;
create policy "Admin or editor can read content_revisions"
  on public.content_revisions for select to authenticated
  using (public.current_user_is_admin() or public.current_user_is_editor());

-- Snapshots the OLD row's editorial fields before an UPDATE lands. Table
-- shape differs (results has no publish_at/category), so branch on
-- TG_TABLE_NAME rather than trying to force one jsonb_build_object across
-- both — a plain `to_jsonb(OLD)` fallback covers any future table added to
-- the trigger without a matching branch.
create or replace function public.record_content_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  snap jsonb;
begin
  if TG_TABLE_NAME = 'announcements' then
    snap := jsonb_build_object(
      'title', OLD.title,
      'title_en', OLD.title_en,
      'content', OLD.content,
      'status', OLD.status,
      'publish_at', OLD.publish_at,
      'category', OLD.category,
      'date', OLD.date
    );
  elsif TG_TABLE_NAME = 'results' then
    snap := jsonb_build_object(
      'title', OLD.title,
      'title_en', OLD.title_en,
      'content', OLD.content,
      'status', OLD.status,
      'date', OLD.date
    );
  else
    snap := to_jsonb(OLD);
  end if;

  insert into public.content_revisions (table_name, row_id, snapshot, changed_by)
  values (TG_TABLE_NAME, OLD.id, snap, auth.uid());

  return new;
end;
$$;

-- WHEN guard skips true no-op updates (e.g. a save with an identical
-- payload); every real edit — including a restore, which is itself an
-- UPDATE — still gets its own revision row. Deliberately not deduped
-- beyond that: the spec calls for "keep it simple, no diff view", and
-- autosave-driven noise is an accepted trade-off (documented in the PR).
drop trigger if exists announcements_record_revision on public.announcements;
create trigger announcements_record_revision
  after update on public.announcements
  for each row
  when (OLD is distinct from NEW)
  execute function public.record_content_revision();

drop trigger if exists results_record_revision on public.results;
create trigger results_record_revision
  after update on public.results
  for each row
  when (OLD is distinct from NEW)
  execute function public.record_content_revision();

-- ============================================================
-- 6. Audit log — audit_log
-- ============================================================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  actor uuid default auth.uid(),
  created_at timestamptz not null default now(),
  changed_fields text[]
);

create index if not exists idx_audit_log_table_row on public.audit_log (table_name, row_id, created_at desc);
create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Read-only, admin-only. No client INSERT/UPDATE/DELETE policy — every row
-- comes from the SECURITY DEFINER trigger below.
drop policy if exists "Admin can read audit_log" on public.audit_log;
create policy "Admin can read audit_log"
  on public.audit_log for select to authenticated
  using (public.current_user_is_admin());

-- Generic across every table it's attached to: relies only on `id` (every
-- target table has one) and jsonb-diffs OLD vs NEW for `changed_fields` on
-- UPDATE. INSERT/DELETE leave changed_fields null — the whole row is the
-- "change".
create or replace function public.record_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed text[];
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (table_name, row_id, action, actor, changed_fields)
    values (TG_TABLE_NAME, NEW.id, 'insert', auth.uid(), null);
    return NEW;
  elsif TG_OP = 'UPDATE' then
    select array_agg(n.key order by n.key)
    into changed
    from jsonb_each(to_jsonb(NEW)) as n(key, value)
    join jsonb_each(to_jsonb(OLD)) as o(key, value) using (key)
    where n.value is distinct from o.value;

    insert into public.audit_log (table_name, row_id, action, actor, changed_fields)
    values (TG_TABLE_NAME, NEW.id, 'update', auth.uid(), changed);
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (table_name, row_id, action, actor, changed_fields)
    values (TG_TABLE_NAME, OLD.id, 'delete', auth.uid(), null);
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists announcements_audit_log on public.announcements;
create trigger announcements_audit_log
  after insert or update or delete on public.announcements
  for each row execute function public.record_audit_log();

drop trigger if exists results_audit_log on public.results;
create trigger results_audit_log
  after insert or update or delete on public.results
  for each row execute function public.record_audit_log();

drop trigger if exists events_audit_log on public.events;
create trigger events_audit_log
  after insert or update or delete on public.events
  for each row execute function public.record_audit_log();

drop trigger if exists carousel_slides_audit_log on public.carousel_slides;
create trigger carousel_slides_audit_log
  after insert or update or delete on public.carousel_slides
  for each row execute function public.record_audit_log();

drop trigger if exists organization_members_audit_log on public.organization_members;
create trigger organization_members_audit_log
  after insert or update or delete on public.organization_members
  for each row execute function public.record_audit_log();

-- ============================================================
-- 7. search_site() — respect the same publish_at gate
-- ============================================================
-- Full re-declaration of 20260824000003_site_search.sql's function; the
-- only change is the added `and (a.publish_at is null or a.publish_at <=
-- now())` clause in announcement_matches. SECURITY INVOKER is unchanged —
-- RLS on announcements is still the real boundary, this keeps the explicit
-- product-intent filter (see the original migration's comment) in sync.
create or replace function public.search_site(query text, locale text default 'zh-TW')
returns table (
  type text,
  id uuid,
  slug text,
  event_slug text,
  title text,
  snippet text,
  rank real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select
      btrim(query) as raw,
      websearch_to_tsquery('simple', query) as tsq
  ),
  announcement_matches as (
    select
      'announcement'::text as type,
      a.id,
      a.slug,
      e.slug as event_slug,
      case
        when locale = 'en' and a.title_en is not null and btrim(a.title_en) <> '' then a.title_en
        else a.title
      end as title,
      left(a.search_text, 160) as snippet,
      (
        (case when a.search_text ilike '%' || q.raw || '%' then 1.0 else 0 end)
        + coalesce(ts_rank(a.search_vector, q.tsq), 0) * 0.5
        + coalesce(similarity(a.search_text, q.raw), 0) * 0.3
      )::real as rank
    from public.announcements a
    left join public.events e on e.id = a.event_id
    cross join q
    where a.status = 'published'
      and (a.publish_at is null or a.publish_at <= now())
      and q.raw <> ''
      and (
        a.search_vector @@ q.tsq
        or a.search_text ilike '%' || q.raw || '%'
        or similarity(a.search_text, q.raw) > 0.15
      )
  ),
  event_matches as (
    select
      'event'::text as type,
      ev.id,
      ev.slug,
      ev.slug as event_slug,
      case
        when locale = 'en' and ev.name_en is not null and btrim(ev.name_en) <> '' then ev.name_en
        else ev.name
      end as title,
      left(ev.search_text, 160) as snippet,
      (
        (case when ev.search_text ilike '%' || q.raw || '%' then 1.0 else 0 end)
        + coalesce(ts_rank(ev.search_vector, q.tsq), 0) * 0.5
        + coalesce(similarity(ev.search_text, q.raw), 0) * 0.3
      )::real as rank
    from public.events ev
    cross join q
    where ev.status = 'published'
      and q.raw <> ''
      and (
        ev.search_vector @@ q.tsq
        or ev.search_text ilike '%' || q.raw || '%'
        or similarity(ev.search_text, q.raw) > 0.15
      )
  ),
  result_matches as (
    select
      'result'::text as type,
      r.id,
      r.id::text as slug,
      e2.slug as event_slug,
      case
        when locale = 'en' and r.title_en is not null and btrim(r.title_en) <> '' then r.title_en
        else r.title
      end as title,
      left(r.search_text, 160) as snippet,
      (
        (case when r.search_text ilike '%' || q.raw || '%' then 1.0 else 0 end)
        + coalesce(ts_rank(r.search_vector, q.tsq), 0) * 0.5
        + coalesce(similarity(r.search_text, q.raw), 0) * 0.3
      )::real as rank
    from public.results r
    left join public.events e2 on e2.id = r.event_id
    cross join q
    where r.status = 'published'
      and q.raw <> ''
      and (
        r.search_vector @@ q.tsq
        or r.search_text ilike '%' || q.raw || '%'
        or similarity(r.search_text, q.raw) > 0.15
      )
  )
  select * from announcement_matches
  union all
  select * from event_matches
  union all
  select * from result_matches
  order by rank desc
  limit 40
$$;

comment on function public.search_site(text, text) is
  'Site-wide search across published announcements/events/results (#45). SECURITY INVOKER — respects table RLS. Announcement branch also gates on publish_at (#47).';
