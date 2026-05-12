-- Allow anonymous users to read profiles (needed for showing author names on public pages)
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);
