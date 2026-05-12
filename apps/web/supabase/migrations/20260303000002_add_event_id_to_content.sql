ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_announcements_event_id ON public.announcements(event_id);
CREATE INDEX IF NOT EXISTS idx_results_event_id ON public.results(event_id);
CREATE INDEX IF NOT EXISTS idx_competitions_event_id ON public.competitions(event_id);
