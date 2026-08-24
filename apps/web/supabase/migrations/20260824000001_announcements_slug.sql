-- Chinese-friendly slugs for announcements. URLs were previously bare UUIDs
-- (/announcement/[id], /events/[slug]/announcements/[id]); this adds a
-- `slug` column so app code can route on a human-readable, CJK-safe path
-- segment instead. Idempotent — safe to re-run against the same database.
--
-- Normalization (mirrored in lib/slug.ts for new/edited rows):
--   1. trim leading/trailing whitespace
--   2. collapse internal whitespace runs to a single '-'
--   3. strip URL-hostile characters: / ? # % & + = " ' < > and the
--      full-width space U+3000
--   4. CJK characters are kept as-is (no transliteration)
-- Collisions get a numeric suffix: the first row keeps the bare slug, the
-- next duplicate becomes "<slug>-2", then "<slug>-3", etc.

alter table announcements
  add column if not exists slug text;

do $$
declare
  rec record;
  base_slug text;
  candidate text;
  suffix int;
begin
  for rec in
    select id, title
    from announcements
    where slug is null
    order by created_at asc, id asc
  loop
    base_slug := btrim(rec.title);
    -- Internal whitespace runs -> single hyphen.
    base_slug := regexp_replace(base_slug, '[ \t\n\r]+', '-', 'g');
    -- Strip URL-hostile punctuation + full-width space; CJK passes through.
    base_slug := regexp_replace(base_slug, '[/?#%&+="''<>　]', '', 'g');
    -- Re-trim stray leading/trailing hyphens left behind by the strip step.
    base_slug := btrim(base_slug, '-');

    if base_slug = '' then
      base_slug := 'announcement';
    end if;

    candidate := base_slug;
    suffix := 1;
    while exists (
      select 1 from announcements where slug = candidate and id <> rec.id
    ) loop
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix;
    end loop;

    update announcements set slug = candidate where id = rec.id;
  end loop;
end $$;

create unique index if not exists announcements_slug_key on announcements (slug);

alter table announcements
  alter column slug set not null;
