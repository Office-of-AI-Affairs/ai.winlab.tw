-- Tags table (two-level hierarchy: parent and child)
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Junction table linking results to tags
CREATE TABLE IF NOT EXISTS public.result_tags (
  result_id uuid NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (result_id, tag_id)
);

-- RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert tags"
  ON public.tags FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update tags"
  ON public.tags FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete tags"
  ON public.tags FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS for result_tags
ALTER TABLE public.result_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read result_tags"
  ON public.result_tags FOR SELECT
  USING (true);

CREATE POLICY "Authors and team leaders can insert result_tags"
  ON public.result_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_id
        AND (
          r.author_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR (r.type = 'team' AND r.team_id IS NOT NULL AND
              'leader' = (SELECT tm.role FROM public.team_members tm WHERE tm.team_id = r.team_id AND tm.user_id = auth.uid()))
        )
    )
  );

CREATE POLICY "Authors and team leaders can delete result_tags"
  ON public.result_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_id
        AND (
          r.author_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR (r.type = 'team' AND r.team_id IS NOT NULL AND
              'leader' = (SELECT tm.role FROM public.team_members tm WHERE tm.team_id = r.team_id AND tm.user_id = auth.uid()))
        )
    )
  );
