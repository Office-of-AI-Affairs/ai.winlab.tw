-- Security advisor 0011: functions without a pinned search_path. Most load-
-- bearing is sync_gravatar_url (SECURITY DEFINER) — a mutable search_path on a
-- definer function is a privilege-escalation vector. Pin all six to a fixed
-- search_path. Applied to production 2026-07-04 via Supabase MCP; backfills IaC.
do $$
declare
  fn text;
  sig text;
begin
  for fn, sig in
    select p.proname, pg_get_function_identity_arguments(p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'update_external_results_updated_at','gravatar_url','sync_gravatar_url',
        'compute_has_profile_data','set_articles_updated_at','set_articles_published_at'
      )
  loop
    execute format('alter function public.%I(%s) set search_path = public, extensions', fn, sig);
  end loop;
end $$;
