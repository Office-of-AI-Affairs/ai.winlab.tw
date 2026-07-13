-- Bilingual content for the introduction record (Phase 1 of the i18n content
-- pilot). Nullable English columns; NULL => /en falls back to zh-TW content and
-- shows the "available in Chinese only" notice. RLS is unchanged: the existing
-- "Anyone can read introduction" policy is row-level (USING true), so anon reads
-- these new columns automatically; INSERT/UPDATE remain admin-only.
alter table public.introduction
  add column if not exists title_en   text,
  add column if not exists content_en jsonb;
