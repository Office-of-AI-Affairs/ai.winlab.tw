-- oauth-1 (defense-in-depth): make public.oauth_clients service-role only.
--
-- The anon INSERT policy "anon can insert oauth clients" let anyone POST a row
-- to /rest/v1/oauth_clients with the public anon/publishable key, choosing an
-- arbitrary redirect_uri. That bypassed the registration-time host allowlist
-- (assertAllowedRedirectUri only runs in /oauth/register) and seeded the OAuth
-- phishing / account-takeover chain. The use-time allowlist re-check (PR #20)
-- already neutralizes the exploit; this removes the rogue-row vector entirely.
--
-- Safe / non-breaking: legitimate Dynamic Client Registration goes through
-- registerOAuthClient(), which inserts via the service-role client and bypasses
-- RLS — it never relied on the anon policy. anon SELECT was already removed
-- (20260518000001). After this, oauth_clients has RLS enabled with no policies,
-- i.e. service-role only — the same default-deny posture as oauth_auth_codes.

DROP POLICY IF EXISTS "anon can insert oauth clients" ON public.oauth_clients;

-- Belt-and-suspenders: drop the table-level write grants so a write is rejected
-- at the privilege layer too, not just by RLS default-deny. service_role keeps
-- its own grant and is unaffected.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.oauth_clients FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.oauth_clients FROM authenticated;
