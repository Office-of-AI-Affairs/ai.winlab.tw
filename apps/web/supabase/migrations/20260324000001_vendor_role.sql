-- 1. Extend role constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'vendor'));

-- 2. Create event_vendors junction table
CREATE TABLE public.event_vendors (
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor sees own rows, admin sees all"
  ON public.event_vendors FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can insert event_vendors"
  ON public.event_vendors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update event_vendors"
  ON public.event_vendors FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can delete event_vendors"
  ON public.event_vendors FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Add created_by to competitions
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 4. Create recruitment_interests table
CREATE TABLE public.recruitment_interests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

ALTER TABLE public.recruitment_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own interests, vendor sees event interests, admin sees all"
  ON public.recruitment_interests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.competitions c
      JOIN public.event_vendors ev ON ev.event_id = c.event_id
      WHERE c.id = recruitment_interests.competition_id
        AND ev.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated user can insert own interest"
  ON public.recruitment_interests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can delete own interest"
  ON public.recruitment_interests FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. Interest count function (SECURITY DEFINER — bypasses RLS for count only)
CREATE OR REPLACE FUNCTION public.get_interest_count(p_competition_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.recruitment_interests
  WHERE competition_id = p_competition_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_interest_count(uuid) TO anon, authenticated;

-- 6. Replace competitions write policies to include vendor
DROP POLICY IF EXISTS "Admin can insert competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin can update competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin can delete competition" ON public.competitions;

CREATE POLICY "Admin or assigned vendor can insert competition"
  ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
      )
    )
  );

CREATE POLICY "Admin or owning vendor can update competition"
  ON public.competitions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND competitions.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
      )
    )
  );

CREATE POLICY "Admin or owning vendor can delete competition"
  ON public.competitions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND competitions.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
      )
    )
  );

-- 7. Replace competition_private_details write policies to include vendor
DROP POLICY IF EXISTS "Admin can insert competition_private_details" ON public.competition_private_details;
DROP POLICY IF EXISTS "Admin can update competition_private_details" ON public.competition_private_details;
DROP POLICY IF EXISTS "Admin can delete competition_private_details" ON public.competition_private_details;

CREATE POLICY "Admin or owning vendor can insert competition_private_details"
  ON public.competition_private_details FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin or owning vendor can update competition_private_details"
  ON public.competition_private_details FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin or owning vendor can delete competition_private_details"
  ON public.competition_private_details FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  );
