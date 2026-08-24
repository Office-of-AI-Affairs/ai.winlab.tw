-- Site-wide search (#45). Postgres FTS on the three public content types
-- (announcements, events, results), combined with a pg_trgm fallback because
-- `to_tsvector('simple', ...)` treats a contiguous run of CJK characters as a
-- single lexeme — a zh-TW substring query (e.g. "人工智慧" against a stored
-- "人工智慧論壇") won't satisfy `@@` unless the query happens to equal a whole
-- token. `simple` FTS still earns its keep for English/mixed content and for
-- exact zh-TW token matches; pg_trgm ILIKE/similarity covers the CJK
-- substring case FTS structurally can't.
--
-- DO NOT apply via the dashboard policy UI — SQL Editor / migration runner
-- only, same as every other file in this directory.

create extension if not exists pg_trgm with schema extensions;

-- Walk a Tiptap document (jsonb) and concatenate every leaf "text" value.
-- `$.**.text` is the recursive-descent jsonpath wildcard (PG 12+): it matches
-- the `text` key at any depth, which is exactly where Tiptap puts leaf text
-- runs (`{ "type": "text", "text": "..." }`). Marked IMMUTABLE so it's legal
-- inside a STORED GENERATED column expression below.
create or replace function public.tiptap_extract_text(node jsonb)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(string_agg(leaf.value #>> '{}', ' '), '')
  from jsonb_path_query(coalesce(node, '{}'::jsonb), '$.**.text') as leaf(value)
$$;

comment on function public.tiptap_extract_text(jsonb) is
  'Extract concatenated leaf text from a Tiptap JSON document, for FTS/trigram indexing.';

-- === announcements ===========================================================

alter table public.announcements
  add column if not exists search_text text
    generated always as (
      coalesce(title, '') || ' ' || coalesce(title_en, '') || ' ' ||
      coalesce(public.tiptap_extract_text(content), '')
    ) stored;

alter table public.announcements
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector(
        'simple',
        coalesce(title, '') || ' ' || coalesce(title_en, '') || ' ' ||
        coalesce(public.tiptap_extract_text(content), '')
      )
    ) stored;

create index if not exists announcements_search_vector_idx
  on public.announcements using gin (search_vector);

create index if not exists announcements_search_text_trgm_idx
  on public.announcements using gin (search_text extensions.gin_trgm_ops);

-- === events ===================================================================
-- No jsonb body — `name`/`name_en`/`description` are the only searchable
-- fields (events have no Tiptap content column).

alter table public.events
  add column if not exists search_text text
    generated always as (
      coalesce(name, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(description, '')
    ) stored;

alter table public.events
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector(
        'simple',
        coalesce(name, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(description, '')
      )
    ) stored;

create index if not exists events_search_vector_idx
  on public.events using gin (search_vector);

create index if not exists events_search_text_trgm_idx
  on public.events using gin (search_text extensions.gin_trgm_ops);

-- === results ==================================================================

alter table public.results
  add column if not exists search_text text
    generated always as (
      coalesce(title, '') || ' ' || coalesce(title_en, '') || ' ' ||
      coalesce(public.tiptap_extract_text(content), '')
    ) stored;

alter table public.results
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector(
        'simple',
        coalesce(title, '') || ' ' || coalesce(title_en, '') || ' ' ||
        coalesce(public.tiptap_extract_text(content), '')
      )
    ) stored;

create index if not exists results_search_vector_idx
  on public.results using gin (search_vector);

create index if not exists results_search_text_trgm_idx
  on public.results using gin (search_text extensions.gin_trgm_ops);

-- === search_site() ============================================================
-- SECURITY INVOKER (not DEFINER): runs as the calling role, so the existing
-- "anon/user: published only, admin: all" RLS on announcements/events/results
-- still applies underneath. The explicit `status = 'published'` filters below
-- are belt-and-suspenders / match the product intent in #45 (global search
-- only ever surfaces public content, even for a logged-in admin) — RLS is the
-- actual security boundary, this is just making the same intent explicit and
-- query-planner-friendly.
--
-- `locale` picks the *_en title when present (mirrors lib/i18n/localized-field
-- .ts's fallback rule) but body search stays zh-TW only — Tiptap content has
-- no English translation yet (see 20260824000002_i18n_announcements_events_
-- results_en.sql), so search_text always includes the zh-TW body regardless
-- of locale.
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
  'Site-wide search across published announcements/events/results (#45). SECURITY INVOKER — respects table RLS.';

-- Functions default to GRANT EXECUTE TO PUBLIC; explicit grant here documents
-- intent (visitor-facing search, same posture as get_public_recruitment_positions).
grant execute on function public.search_site(text, text) to anon, authenticated;
