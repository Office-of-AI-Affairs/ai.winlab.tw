# Database Types

This repo and `~/ai.winlab.tw` share one Supabase project
(`hwezfbhjcetpezfuvelf`). Row/Insert/Update shapes live in
`lib/supabase/database.types.ts`; domain aliases live in
`lib/supabase/types.ts`.

## Single source of truth

`database.types.ts` is generated from the live schema. Do not hand-edit
beyond what the schema dictates — drift between the two repos will
cause MCP tool ↔ frontend misalignment. The file's header comment
points back to this rule.

## Regenerating

1. Grab a Supabase personal access token from
   <https://supabase.com/dashboard/account/tokens> and put it in
   `.env.local` as `SUPABASE_ACCESS_TOKEN`.
2. Run `bun gen:types` in either this repo or the sibling app repo —
   both scripts target the same project id so the output is identical.
3. Copy the regenerated file across to the sibling repo:
   ```sh
   cp lib/supabase/database.types.ts ~/ai.winlab.tw/lib/supabase/database.types.ts
   # or the other direction
   ```
4. Run `bun check` (lint + typecheck + tests) in both repos. Fix any
   domain alias drift in `types.ts` (e.g. jsonb shape overlays).

## When to regenerate

- Any `ALTER TABLE` / new table / new column in `supabase/migrations/`
  of the main app repo
- New enum literal or CHECK constraint that narrows a column's value
- New SQL function whose signature is callable from the client

## Domain overlay rules

Anything hand-written — Tiptap content shape, recruitment position
structure, application method jsonb — goes in `types.ts`, not here.
`database.types.ts` should look like machine output; the moment you
need judgement, move it into `types.ts`.
