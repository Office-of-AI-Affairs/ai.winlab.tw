-- Extend the published_at auto-stamp trigger to also fire on INSERT.
-- The original (20260515000003) only ran BEFORE UPDATE, which broke
-- direct create_insight calls from MCP that insert with status='published'
-- in one shot — those rows stayed at published_at = NULL and dropped to
-- the bottom of the timeline.

DROP TRIGGER IF EXISTS articles_set_published_at ON public.articles;

CREATE OR REPLACE FUNCTION public.set_articles_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_set_published_at
  BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_articles_published_at();
