-- FK covering indexes (advisor lint 0001_unindexed_foreign_keys)
CREATE INDEX IF NOT EXISTS idx_competitions_created_by ON public.competitions(created_by);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_user_id ON public.event_vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_external_results_user_id ON public.external_results(user_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_interests_user_id ON public.recruitment_interests(user_id);
