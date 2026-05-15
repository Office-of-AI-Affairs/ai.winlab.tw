-- Auto-stamp published_at the first time an article flips to published.
-- Lets useContentEditor.publish() stay generic — caller just toggles status,
-- the DB fills in published_at so list ordering works on first publish.

CREATE OR REPLACE FUNCTION public.set_articles_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (OLD.status IS DISTINCT FROM 'published')
     AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_set_published_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_articles_published_at();
