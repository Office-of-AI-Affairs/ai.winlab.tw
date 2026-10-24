-- search_site() ran as the caller under Supabase, so RLS hid unpublished
-- events and their slugs came back null. Without RLS the joins must say it:
-- results inside a draft event no longer leak the event's slug.
CREATE OR REPLACE FUNCTION "public"."search_site"("query" "text", "locale" "text" DEFAULT 'zh-TW'::"text") RETURNS TABLE("type" "text", "id" "uuid", "slug" "text", "event_slug" "text", "title" "text", "snippet" "text", "rank" real)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
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
    left join public.events e on e.id = a.event_id and e.status = 'published'
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
    left join public.events e2 on e2.id = r.event_id and e2.status = 'published'
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
