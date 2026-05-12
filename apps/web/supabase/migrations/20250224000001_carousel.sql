-- Carousel slides for homepage banner (title, description, link, image)
create table if not exists public.carousel_slides (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null default '',
  description text,
  link text,
  image text,
  sort_order int not null default 0
);

drop trigger if exists carousel_slides_updated_at on public.carousel_slides;
create trigger carousel_slides_updated_at
  before update on public.carousel_slides
  for each row execute function public.set_updated_at();

alter table public.carousel_slides enable row level security;

-- Everyone can read carousel slides (for homepage)
create policy "Anyone can read carousel_slides"
  on public.carousel_slides for select
  to anon, authenticated
  using (true);

-- Only admins can insert/update/delete
create policy "Admin can insert carousel_slides"
  on public.carousel_slides for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin can update carousel_slides"
  on public.carousel_slides for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin can delete carousel_slides"
  on public.carousel_slides for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Carousel images: use existing bucket "announcement-images" with path prefix carousel/
-- No new bucket or storage policies needed; existing bucket already allows authenticated upload and public read.
