# Refresh `lib/security/rls-snapshot.json`

The RLS contract test (`lib/security/rls-contracts.test.ts`) asserts against a
snapshot of all production RLS policies. The snapshot needs to be refreshed
whenever an RLS migration ships, otherwise CI will silently freeze on a stale
view of prod.

## Workflow

1. Apply the RLS migration to production (via `supabase db push` or MCP
   `apply_migration`).
2. Run the SQL below — easiest via the Supabase MCP `execute_sql` tool, or paste
   into the SQL editor at <https://supabase.com/dashboard/project/_/sql>.
3. Translate the result into the JSON shape used by `rls-snapshot.json`:
   - `tables_with_rls`: from query `RLS_TABLE_QUERY`
   - `policies`: from query `RLS_POLICY_QUERY`, summarised into the human
     readable `using_summary` / `check_summary` form (one short phrase per
     branch, separated by `OR`; use `is_admin`, `is_recruitment_owner`,
     `auth.uid()`, `status='published'`, etc.).
4. Update `generated_at` to today.
5. Open a PR. Reviewer checks the diff: every change to RLS state should map
   to a migration that landed in the same PR.

## SQL: tables with RLS

```sql
SELECT json_agg(t ORDER BY rel) AS tables FROM (
  SELECT n.nspname || '.' || c.relname AS rel,
         (SELECT count(*) FROM pg_policy WHERE polrelid=c.oid)::int AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind='r'
    AND c.relrowsecurity
    AND n.nspname IN ('public','storage')
    AND NOT (c.relname LIKE 'buckets%' OR c.relname LIKE 's3_%' OR c.relname='migrations' OR c.relname='vector_indexes')
) t;
```

## SQL: full policy dump

```sql
SELECT json_agg(p ORDER BY rel, op, polname) AS snapshot FROM (
  SELECT n.nspname || '.' || c.relname AS rel,
         p.polname,
         CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END AS op,
         COALESCE((SELECT array_agg(rolname ORDER BY rolname) FROM pg_roles WHERE oid = ANY(p.polroles)), ARRAY['public']::name[]) AS roles,
         pg_get_expr(p.polqual, p.polrelid) AS using_expr,
         pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public','storage')
) p;
```

## Summary phrase glossary

When translating raw `using_expr` / `check_expr` into the snapshot's
`using_summary` / `check_summary`, use these canonical phrases so the test
matchers stay simple and stable:

| Phrase | Maps to |
|--------|---------|
| `auth.uid()` | `(select auth.uid())` |
| `is_admin` | `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')` |
| `is_recruitment_owner` | `EXISTS (SELECT 1 FROM competition_owners co WHERE co.competition_id = X AND co.user_id = auth.uid())` |
| `is_result_author` | `EXISTS (SELECT 1 FROM results r WHERE r.id = X AND r.author_id = auth.uid())` |
| `status='published'` | `(status = 'published'::text)` |
| `bucket='X'` | `(bucket_id = 'X'::text)` |
| `foldername[1]=auth.uid()` | `((storage.foldername(name))[1] = (auth.uid())::text)` |

Branches in OR'd predicates are joined with ` OR ` and listed in the order
they appear in the SQL. Branches in AND'd predicates are joined with ` AND `.

## When to NOT use this workflow

- For one-off ad-hoc inspection: just run the SQL, don't update the snapshot.
- For a brand-new role / table that the docs/permissions.md doesn't cover yet:
  update `docs/permissions.md` first, then this snapshot, then write the test.
