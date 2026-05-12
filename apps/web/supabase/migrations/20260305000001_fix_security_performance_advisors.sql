-- ============================================================
-- Fix Supabase Security & Performance Advisors
--
-- Addresses:
--   [SECURITY] function_search_path_mutable - 5 functions
--   [SECURITY] rls_policy_always_true - announcements, competitions, introduction, results
--   [PERFORMANCE] auth_rls_initplan - replace auth.uid() with (select auth.uid())
--   [PERFORMANCE] multiple_permissive_policies - drop duplicate/redundant policies
--   [PERFORMANCE] unindexed_foreign_keys - add 10 missing FK indexes
-- ============================================================

-- ============================================================
-- 1. Fix function search_path (prevents schema injection)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (new.id, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_competitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 2. announcements: drop old policies, recreate correctly
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.announcements;
-- "Anyone can read published announcements" applies to all roles (public); replace with anon-only
DROP POLICY IF EXISTS "Anyone can read published announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can read all" ON public.announcements;

CREATE POLICY "Anon read published announcements"
  ON public.announcements FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated read all announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can insert announcement"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can update announcement"
  ON public.announcements FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can delete announcement"
  ON public.announcements FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 3. introduction: drop overly-broad policies, recreate admin-only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert introduction" ON public.introduction;
DROP POLICY IF EXISTS "Authenticated users can update introduction" ON public.introduction;

CREATE POLICY "Admin can insert introduction"
  ON public.introduction FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can update introduction"
  ON public.introduction FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 4. competitions: drop duplicates and overly-broad policies
-- ============================================================
DROP POLICY IF EXISTS "Allow public read competitions" ON public.competitions;
DROP POLICY IF EXISTS "Allow authenticated delete competitions" ON public.competitions;
DROP POLICY IF EXISTS "Allow authenticated insert competitions" ON public.competitions;
DROP POLICY IF EXISTS "Allow authenticated update competitions" ON public.competitions;
-- Recreate existing admin policies with (select auth.uid()) and TO authenticated
DROP POLICY IF EXISTS "Admin can insert competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin can update competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin can delete competition" ON public.competitions;

CREATE POLICY "Admin can insert competition"
  ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can update competition"
  ON public.competitions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can delete competition"
  ON public.competitions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 5. results: drop duplicates and overly-broad policies
-- ============================================================
DROP POLICY IF EXISTS "Allow public read published results" ON public.results;
DROP POLICY IF EXISTS "Allow authenticated read all results" ON public.results;
DROP POLICY IF EXISTS "Allow authenticated delete results" ON public.results;
DROP POLICY IF EXISTS "Allow authenticated insert results" ON public.results;
DROP POLICY IF EXISTS "Allow authenticated update results" ON public.results;
-- Recreate existing proper policies with (select auth.uid())
DROP POLICY IF EXISTS "Author can insert result" ON public.results;
DROP POLICY IF EXISTS "Author or team leader or admin can update result" ON public.results;
DROP POLICY IF EXISTS "Author or team leader or admin can delete result" ON public.results;

CREATE POLICY "Author can insert result"
  ON public.results FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      type = 'personal'
      OR (
        type = 'team' AND team_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = results.team_id
            AND tm.user_id = (SELECT auth.uid())
            AND tm.role = 'leader'
        )
      )
    )
  );

CREATE POLICY "Author or team leader or admin can update result"
  ON public.results FOR UPDATE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (
      type = 'team' AND team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = results.team_id
          AND tm.user_id = (SELECT auth.uid())
          AND tm.role = 'leader'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "Author or team leader or admin can delete result"
  ON public.results FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (
      type = 'team' AND team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = results.team_id
          AND tm.user_id = (SELECT auth.uid())
          AND tm.role = 'leader'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- ============================================================
-- 6. profiles: drop redundant/duplicate policies, fix auth.uid()
-- ============================================================
-- "Users can read own profile" (roles: public) is redundant:
--   anon is covered by "Anyone can read profiles" (USING true)
--   authenticated is covered by "Authenticated can read profiles" (USING true)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 7. teams: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Team members can read team" ON public.teams;
DROP POLICY IF EXISTS "Authenticated can create team" ON public.teams;
DROP POLICY IF EXISTS "Leader can update team" ON public.teams;
DROP POLICY IF EXISTS "Leader can delete team" ON public.teams;

CREATE POLICY "Team members can read team"
  ON public.teams FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = teams.id AND tm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Authenticated can create team"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = leader_id);

CREATE POLICY "Leader can update team"
  ON public.teams FOR UPDATE TO authenticated
  USING (leader_id = (SELECT auth.uid()));

CREATE POLICY "Leader can delete team"
  ON public.teams FOR DELETE TO authenticated
  USING (leader_id = (SELECT auth.uid()));

-- ============================================================
-- 8. team_members: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Members can read team_members" ON public.team_members;
DROP POLICY IF EXISTS "Leader can insert team_members" ON public.team_members;
DROP POLICY IF EXISTS "Leader can delete team_members" ON public.team_members;
DROP POLICY IF EXISTS "User can leave team" ON public.team_members;

CREATE POLICY "Members can read team_members"
  ON public.team_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id AND tm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Leader can insert team_members"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id AND t.leader_id = (SELECT auth.uid())
  ));

CREATE POLICY "Leader can delete team_members"
  ON public.team_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id AND t.leader_id = (SELECT auth.uid())
  ));

CREATE POLICY "User can leave team"
  ON public.team_members FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 9. team_invitations: fix auth.uid() / auth.jwt()
-- ============================================================
DROP POLICY IF EXISTS "Invitee or leader can read invitation" ON public.team_invitations;
DROP POLICY IF EXISTS "Leader can insert invitation" ON public.team_invitations;
DROP POLICY IF EXISTS "Leader or invitee can update invitation" ON public.team_invitations;

CREATE POLICY "Invitee or leader can read invitation"
  ON public.team_invitations FOR SELECT TO authenticated
  USING (
    invited_by = (SELECT auth.uid())
    OR ((SELECT auth.jwt()) ->> 'email')::text = email
  );

CREATE POLICY "Leader can insert invitation"
  ON public.team_invitations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id AND t.leader_id = (SELECT auth.uid())
  ));

CREATE POLICY "Leader or invitee can update invitation"
  ON public.team_invitations FOR UPDATE TO authenticated
  USING (
    invited_by = (SELECT auth.uid())
    OR ((SELECT auth.jwt()) ->> 'email')::text = email
  );

-- ============================================================
-- 10. organization_members: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Admin can insert organization_members" ON public.organization_members;
DROP POLICY IF EXISTS "Admin can update organization_members" ON public.organization_members;
DROP POLICY IF EXISTS "Admin can delete organization_members" ON public.organization_members;

CREATE POLICY "Admin can insert organization_members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can update organization_members"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can delete organization_members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 11. tags: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Admin can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Admin can update tags" ON public.tags;
DROP POLICY IF EXISTS "Admin can delete tags" ON public.tags;

CREATE POLICY "Admin can insert tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ));

CREATE POLICY "Admin can update tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ));

CREATE POLICY "Admin can delete tags"
  ON public.tags FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ));

-- ============================================================
-- 12. result_tags: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Author or leader or admin can insert result_tags" ON public.result_tags;
DROP POLICY IF EXISTS "Author or leader or admin can delete result_tags" ON public.result_tags;
-- Also drop old names from earlier migrations (if any)
DROP POLICY IF EXISTS "Authors and team leaders can insert result_tags" ON public.result_tags;
DROP POLICY IF EXISTS "Authors and team leaders can delete result_tags" ON public.result_tags;

CREATE POLICY "Author or leader or admin can insert result_tags"
  ON public.result_tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.results r
    WHERE r.id = result_id
      AND (
        r.author_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
        OR (
          r.type = 'team' AND r.team_id IS NOT NULL
          AND 'leader' = (
            SELECT tm.role FROM public.team_members tm
            WHERE tm.team_id = r.team_id AND tm.user_id = (SELECT auth.uid())
          )
        )
      )
  ));

CREATE POLICY "Author or leader or admin can delete result_tags"
  ON public.result_tags FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.results r
    WHERE r.id = result_id
      AND (
        r.author_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
        OR (
          r.type = 'team' AND r.team_id IS NOT NULL
          AND 'leader' = (
            SELECT tm.role FROM public.team_members tm
            WHERE tm.team_id = r.team_id AND tm.user_id = (SELECT auth.uid())
          )
        )
      )
  ));

-- ============================================================
-- 13. carousel_slides: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Admin can insert carousel_slides" ON public.carousel_slides;
DROP POLICY IF EXISTS "Admin can update carousel_slides" ON public.carousel_slides;
DROP POLICY IF EXISTS "Admin can delete carousel_slides" ON public.carousel_slides;

CREATE POLICY "Admin can insert carousel_slides"
  ON public.carousel_slides FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can update carousel_slides"
  ON public.carousel_slides FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can delete carousel_slides"
  ON public.carousel_slides FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 14. contacts: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Admin can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can delete contacts" ON public.contacts;

CREATE POLICY "Admin can insert contacts"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can update contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin can delete contacts"
  ON public.contacts FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 15. privacy_policy: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert privacy policy versions" ON public.privacy_policy;

CREATE POLICY "Admins can insert privacy policy versions"
  ON public.privacy_policy FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ));

-- ============================================================
-- 16. events: fix auth.uid() → (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Admin insert events" ON public.events;
DROP POLICY IF EXISTS "Admin update events" ON public.events;
DROP POLICY IF EXISTS "Admin delete events" ON public.events;

CREATE POLICY "Admin insert events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin update events"
  ON public.events FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "Admin delete events"
  ON public.events FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  ));

-- ============================================================
-- 17. Add missing FK indexes (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_created_by ON public.privacy_policy(created_by);
CREATE INDEX IF NOT EXISTS idx_result_tags_tag_id ON public.result_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_results_author_id ON public.results(author_id);
CREATE INDEX IF NOT EXISTS idx_results_team_id ON public.results(team_id);
CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON public.tags(parent_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invited_by ON public.team_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams(leader_id);
