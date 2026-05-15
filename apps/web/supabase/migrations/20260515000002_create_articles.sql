-- Insights articles — long-form posts from office members. Separate table
-- from `announcements` so RLS stays single-condition (member/admin scope)
-- without kind-conditional branching.

CREATE TABLE public.articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT '新文章',
  summary         text,
  cover_image_url text,
  content         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_author_id    ON public.articles(author_id);
CREATE INDEX idx_articles_status       ON public.articles(status);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);

-- updated_at trigger — reuse the shared helper if it exists; otherwise inline.
CREATE OR REPLACE FUNCTION public.set_articles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_articles_updated_at();

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- SELECT: published is public; drafts visible to author + admin only.
-- Consolidated into one policy (same pattern as 20260419000004).
CREATE POLICY "Read published or own draft or admin"
  ON public.articles FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR author_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- INSERT: admin (free choice of author_id) or member (must be themselves).
CREATE POLICY "Admin or member can insert article"
  ON public.articles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  );

-- UPDATE: admin anything; member only their own.
CREATE POLICY "Admin or author member can update article"
  ON public.articles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  );

-- DELETE: admin anything; member only their own.
CREATE POLICY "Admin or author member can delete article"
  ON public.articles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  );
