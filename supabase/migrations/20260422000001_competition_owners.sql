-- Per-recruitment ownership. Replaces the event-level `event_vendors` check
-- for edit / applicant-view permissions. `event_vendors` stays as a table for
-- now (no writes from app), but its permission role is fully superseded here.
--
-- Ownership model:
--   * admin  — full control, can add/remove any competition's owners
--   * owner  — can edit that competition (+ its private details) and see its
--              applicants; cannot manage the owner list itself
--   * others — read-only on public competition row, nothing else

-- 1. Pivot table
CREATE TABLE public.competition_owners (
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_id, user_id)
);

CREATE INDEX idx_competition_owners_user_id ON public.competition_owners(user_id);

ALTER TABLE public.competition_owners ENABLE ROW LEVEL SECURITY;

-- 2. RLS on competition_owners
-- Read: admin, the owner themselves, or a co-owner of the same competition
CREATE POLICY "Owner, co-owner, or admin can read competition_owners"
  ON public.competition_owners FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co2
               WHERE co2.competition_id = competition_owners.competition_id
                 AND co2.user_id = (select auth.uid()))
  );

-- Write: admin only (explicit requirement — owners cannot self-assign
-- co-owners, that authority stays with platform admins)
CREATE POLICY "Admin can insert competition_owners"
  ON public.competition_owners FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = (select auth.uid()) AND p.role = 'admin'));

CREATE POLICY "Admin can delete competition_owners"
  ON public.competition_owners FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = (select auth.uid()) AND p.role = 'admin'));

-- 3. Trigger: creator auto-becomes owner when a new recruitment is inserted.
-- Keeps `created_by` as an audit trail while guaranteeing the creator can
-- still edit what they just made without a second round-trip.
CREATE OR REPLACE FUNCTION public.auto_add_recruitment_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.competition_owners (competition_id, user_id, added_by)
    VALUES (NEW.id, NEW.created_by, NEW.created_by)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_add_recruitment_owner
  AFTER INSERT ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_recruitment_owner();

-- 4. Backfill
-- 4a. Existing non-admin creators → owners
INSERT INTO public.competition_owners (competition_id, user_id, added_by)
SELECT c.id, c.created_by, c.created_by
FROM public.competitions c
JOIN public.profiles p ON p.id = c.created_by
WHERE p.role <> 'admin'
ON CONFLICT DO NOTHING;

-- 4b. ai-rising-star: auto-match by application_method/contact email → vendor
WITH recruitments AS (
  SELECT c.id AS rid,
         lower(cpd.application_method->>'email')  AS am_email,
         lower(cpd.contact->>'email')            AS contact_email
  FROM public.competitions c
  LEFT JOIN public.competition_private_details cpd ON cpd.competition_id = c.id
  WHERE c.event_id = (SELECT id FROM public.events WHERE slug = 'ai-rising-star')
),
vendors AS (
  SELECT ev.user_id, lower(u.email) AS vendor_email
  FROM public.event_vendors ev
  JOIN auth.users u ON u.id = ev.user_id
  WHERE ev.event_id = (SELECT id FROM public.events WHERE slug = 'ai-rising-star')
)
INSERT INTO public.competition_owners (competition_id, user_id)
SELECT DISTINCT r.rid, v.user_id
FROM recruitments r
JOIN vendors v ON v.vendor_email = r.am_email OR v.vendor_email = r.contact_email
ON CONFLICT DO NOTHING;

-- 4c. Serena → 新漢（email 在 am_email 逗號列表中，4b 抓不到）
INSERT INTO public.competition_owners (competition_id, user_id)
SELECT 'b21cc809-b073-4acc-9a6e-df03322cd6cc'::uuid, id
FROM auth.users
WHERE email = 'serenaliu@nexcom.com.tw'
ON CONFLICT DO NOTHING;

-- 5. Rewrite RLS on competitions — drop old (event_vendor + created_by) checks
DROP POLICY IF EXISTS "Admin or owning vendor can update competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin or owning vendor can delete competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin or assigned vendor can insert competition" ON public.competitions;

-- INSERT: admin only (vendors can't spawn brand-new recruitments; creator
-- is guaranteed to be the admin that kicked it off)
CREATE POLICY "Admin can insert competition" ON public.competitions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = (select auth.uid()) AND p.role = 'admin'));

CREATE POLICY "Admin or owner can update competition" ON public.competitions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = competitions.id
                 AND co.user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = competitions.id
                 AND co.user_id = (select auth.uid()))
  );

CREATE POLICY "Admin or owner can delete competition" ON public.competitions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = competitions.id
                 AND co.user_id = (select auth.uid()))
  );

-- 6. Rewrite RLS on competition_private_details
DROP POLICY IF EXISTS "Admin or owning vendor can insert competition_private_details" ON public.competition_private_details;
DROP POLICY IF EXISTS "Admin or owning vendor can update competition_private_details" ON public.competition_private_details;
DROP POLICY IF EXISTS "Admin or owning vendor can delete competition_private_details" ON public.competition_private_details;

CREATE POLICY "Admin or owner can insert competition_private_details"
  ON public.competition_private_details FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = competition_private_details.competition_id
                 AND co.user_id = (select auth.uid()))
  );

CREATE POLICY "Admin or owner can update competition_private_details"
  ON public.competition_private_details FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = competition_private_details.competition_id
                 AND co.user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = competition_private_details.competition_id
                 AND co.user_id = (select auth.uid()))
  );

CREATE POLICY "Admin or owner can delete competition_private_details"
  ON public.competition_private_details FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = competition_private_details.competition_id
                 AND co.user_id = (select auth.uid()))
  );

-- 7. Rewrite RLS on recruitment_interests SELECT — owner-scoped, not event-scoped
DROP POLICY IF EXISTS "Users see own interests, vendor sees event interests, admin see" ON public.recruitment_interests;

CREATE POLICY "Self, owner, or admin can read recruitment_interests"
  ON public.recruitment_interests FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (select auth.uid()) AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.competition_owners co
               WHERE co.competition_id = recruitment_interests.competition_id
                 AND co.user_id = (select auth.uid()))
  );
