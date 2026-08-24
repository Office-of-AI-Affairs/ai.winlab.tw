-- Chinese-friendly slugs for announcements. URLs were previously bare UUIDs
-- (/announcement/[id], /events/[slug]/announcements/[id]); this adds a
-- `slug` column so app code can route on a human-readable, CJK-safe path
-- segment instead. Idempotent — safe to re-run against the same database.
--
-- Normalization (mirrored in apps/web/lib/slug.ts for the web app's own
-- pre-computed slugs, kept here as the DB-side source of truth so ANY
-- writer — the web app, the MCP server, future one-off scripts — gets a
-- slug even if it never sets one explicitly):
--   1. trim leading/trailing whitespace
--   2. collapse internal whitespace runs to a single '-'
--   3. strip URL-hostile characters: / ? # % & + = " ' < > and the
--      full-width space U+3000
--   4. CJK characters are kept as-is (no transliteration)
-- Collisions get a numeric suffix: the first row keeps the bare slug, the
-- next duplicate becomes "<slug>-2", then "<slug>-3", etc.

alter table announcements
  add column if not exists slug text;

-- Pure normalization: title -> candidate base slug (no uniqueness check).
create or replace function announcement_slug_from_title(input_title text)
returns text
language plpgsql
immutable
as $$
declare
  result text;
begin
  result := btrim(input_title);
  -- Internal whitespace runs -> single hyphen.
  result := regexp_replace(result, '[ \t\n\r]+', '-', 'g');
  -- Strip URL-hostile punctuation + full-width space; CJK passes through.
  result := regexp_replace(result, '[/?#%&+="''<>　]', '', 'g');
  -- Re-trim stray leading/trailing hyphens left behind by the strip step.
  result := btrim(result, '-');

  if result = '' then
    result := 'announcement';
  end if;

  return result;
end;
$$;

-- Resolve a unique slug for `base_slug`: the bare base if free, otherwise
-- "<base>-2", "<base>-3", … `exclude_id` lets a row check uniqueness
-- against every *other* row (used by both the backfill and the trigger,
-- where the row itself may already carry the candidate).
create or replace function announcement_unique_slug(base_slug text, exclude_id uuid default null)
returns text
language plpgsql
as $$
declare
  candidate text;
  suffix int;
begin
  candidate := base_slug;
  suffix := 1;
  while exists (
    select 1 from announcements
    where slug = candidate
      and (exclude_id is null or id <> exclude_id)
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;
  return candidate;
end;
$$;

-- Backfill existing rows using the same two functions the trigger below
-- uses for every future insert — one normalization/collision policy, not
-- two copies of it.
do $$
declare
  rec record;
begin
  for rec in
    select id, title
    from announcements
    where slug is null
    order by created_at asc, id asc
  loop
    update announcements
    set slug = announcement_unique_slug(announcement_slug_from_title(rec.title), rec.id)
    where id = rec.id;
  end loop;
end $$;

create unique index if not exists announcements_slug_key on announcements (slug);

alter table announcements
  alter column slug set not null;

-- Any writer that inserts a row without a slug (the MCP server's
-- create_announcement tool does exactly this today, and any future script
-- will too unless it remembers not to) gets one filled in automatically —
-- the NOT NULL constraint above is checked *after* BEFORE triggers run, so
-- this always satisfies it. Writers that already computed their own slug
-- (the web app does, for an immediate redirect target) are left alone.
create or replace function announcements_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null then
    new.slug := announcement_unique_slug(announcement_slug_from_title(new.title), new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists announcements_set_slug_trigger on announcements;

create trigger announcements_set_slug_trigger
before insert on announcements
for each row
execute function announcements_set_slug();
