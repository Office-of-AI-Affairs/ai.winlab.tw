-- Drop the deprecated event_vendors table.
--
-- competition_owners (20260422000001_competition_owners.sql) fully replaced
-- the event-level vendor gate. Competitions / competition_private_details /
-- recruitment_interests RLS no longer consult event_vendors, and no app code
-- reads or writes the table. This migration retires it for good.
--
-- CASCADE clears the four leftover RLS policies and the
-- idx_event_vendors_user_id index along with the table.

DROP TABLE IF EXISTS public.event_vendors CASCADE;
