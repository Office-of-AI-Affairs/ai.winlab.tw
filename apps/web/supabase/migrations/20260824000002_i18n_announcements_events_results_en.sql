-- Bilingual titles for announcements, events, and results (Phase 2 of the
-- i18n content pilot — see 20260710000001_i18n_introduction_content_en.sql
-- and 20260713000001_i18n_carousel_slides_en.sql for Phase 1).
--
-- Nullable English columns; NULL / blank => /en falls back to the zh-TW
-- value (see lib/i18n/localized-field.ts). Body/Tiptap content (announcements
-- .content, results.content) intentionally stays zh-TW only for now — /en
-- article pages show an explicit "available in Chinese only" notice instead.
--
-- `events` has no `title` column (its title-equivalent is `name`), so its
-- English column is `name_en` to match the existing `localizedField(row,
-- "name", locale)` call sites, not `title_en`.
--
-- RLS is unchanged: the existing "Anyone can read <table>" policies are
-- row-level (USING true), so anon reads these new columns automatically;
-- INSERT/UPDATE remain scoped to the same admin/author rules as the base
-- columns.
alter table public.announcements
  add column if not exists title_en text;

alter table public.events
  add column if not exists name_en text;

alter table public.results
  add column if not exists title_en text;
