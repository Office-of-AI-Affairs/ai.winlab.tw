-- Bilingual content for homepage carousel banners.
-- Nullable English columns; NULL / blank => /en falls back to zh-TW content.
-- RLS is unchanged: "Anyone can read carousel_slides" is row-level (USING true),
-- so anon reads these new columns automatically; INSERT/UPDATE remain admin-only.
alter table public.carousel_slides
  add column if not exists title_en       text,
  add column if not exists description_en text;
