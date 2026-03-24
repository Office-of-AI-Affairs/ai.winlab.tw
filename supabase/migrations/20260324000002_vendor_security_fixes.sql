-- Security fixes for the vendor role feature

-- 1. Restrict competition_private_details SELECT (was USING (true) for all authenticated)
DROP POLICY IF EXISTS "Authenticated can read competition_private_details" ON public.competition_private_details;

CREATE POLICY "Admin, vendor, or interested user can read competition_private_details"
  ON public.competition_private_details FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.competitions c
      JOIN public.event_vendors ev ON ev.event_id = c.event_id
      WHERE c.id = competition_private_details.competition_id AND ev.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.recruitment_interests ri
      WHERE ri.competition_id = competition_private_details.competition_id AND ri.user_id = (SELECT auth.uid())
    )
  );

-- 2. Remove anon grant from get_interest_count (SECURITY DEFINER should not be callable by anon)
REVOKE EXECUTE ON FUNCTION public.get_interest_count(uuid) FROM anon;

-- 3. Add WITH CHECK to event_vendors UPDATE policy
DROP POLICY IF EXISTS "Admin can update event_vendors" ON public.event_vendors;

CREATE POLICY "Admin can update event_vendors"
  ON public.event_vendors FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- 4. Replace all vendor RLS policies to use (SELECT auth.uid()) for performance
-- event_vendors
DROP POLICY IF EXISTS "Vendor sees own rows, admin sees all" ON public.event_vendors;
CREATE POLICY "Vendor sees own rows, admin sees all"
  ON public.event_vendors FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can insert event_vendors" ON public.event_vendors;
CREATE POLICY "Admin can insert event_vendors"
  ON public.event_vendors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS "Admin can delete event_vendors" ON public.event_vendors;
CREATE POLICY "Admin can delete event_vendors"
  ON public.event_vendors FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- recruitment_interests
DROP POLICY IF EXISTS "Users see own interests, vendor sees event interests, admin sees all" ON public.recruitment_interests;
CREATE POLICY "Users see own interests, vendor sees event interests, admin sees all"
  ON public.recruitment_interests FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.competitions c
      JOIN public.event_vendors ev ON ev.event_id = c.event_id
      WHERE c.id = recruitment_interests.competition_id
        AND ev.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated user can insert own interest" ON public.recruitment_interests;
CREATE POLICY "Authenticated user can insert own interest"
  ON public.recruitment_interests FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "User can delete own interest" ON public.recruitment_interests;
CREATE POLICY "User can delete own interest"
  ON public.recruitment_interests FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- competitions
DROP POLICY IF EXISTS "Admin or assigned vendor can insert competition" ON public.competitions;
CREATE POLICY "Admin or assigned vendor can insert competition"
  ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = (SELECT auth.uid()) AND ev.event_id = competitions.event_id
      )
    )
  );

DROP POLICY IF EXISTS "Admin or owning vendor can update competition" ON public.competitions;
CREATE POLICY "Admin or owning vendor can update competition"
  ON public.competitions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor')
      AND competitions.created_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = (SELECT auth.uid()) AND ev.event_id = competitions.event_id
      )
    )
  );

DROP POLICY IF EXISTS "Admin or owning vendor can delete competition" ON public.competitions;
CREATE POLICY "Admin or owning vendor can delete competition"
  ON public.competitions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor')
      AND competitions.created_by = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = (SELECT auth.uid()) AND ev.event_id = competitions.event_id
      )
    )
  );

-- competition_private_details write policies
DROP POLICY IF EXISTS "Admin or owning vendor can insert competition_private_details" ON public.competition_private_details;
CREATE POLICY "Admin or owning vendor can insert competition_private_details"
  ON public.competition_private_details FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = (SELECT auth.uid())
          AND ev.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Admin or owning vendor can update competition_private_details" ON public.competition_private_details;
CREATE POLICY "Admin or owning vendor can update competition_private_details"
  ON public.competition_private_details FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = (SELECT auth.uid())
          AND ev.user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = (SELECT auth.uid())
          AND ev.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Admin or owning vendor can delete competition_private_details" ON public.competition_private_details;
CREATE POLICY "Admin or owning vendor can delete competition_private_details"
  ON public.competition_private_details FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = (SELECT auth.uid())
          AND ev.user_id = (SELECT auth.uid())
      )
    )
  );
