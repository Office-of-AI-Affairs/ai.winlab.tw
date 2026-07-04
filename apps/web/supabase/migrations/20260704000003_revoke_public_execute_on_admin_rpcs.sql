-- Security advisors 0028/0029: SECURITY DEFINER admin RPCs were callable by the
-- anon role via /rest/v1/rpc. Their bodies self-gate (RAISE unless auth.uid() is
-- an admin), so this is defense-in-depth. Functions default to GRANT EXECUTE TO
-- PUBLIC, so revoking from anon alone is a no-op — revoke from PUBLIC. The
-- authenticated admin client and service_role keep their explicit grants.
-- Applied to production 2026-07-04 via Supabase MCP; backfills IaC.
revoke execute on function public.admin_create_user(text, text, text) from public;
revoke execute on function public.admin_delete_user(uuid) from public;
revoke execute on function public.get_all_users() from public;
