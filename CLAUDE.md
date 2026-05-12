# CLAUDE.md (monorepo root)

bun workspaces monorepo for the WinLab AI Office stack.

## Layout

```
apps/
  web/      Next.js web app — ai.winlab.tw          (CLAUDE.md inside)
  mcp/      MCP server     — mcp.ai.winlab.tw       (AGENTS.md inside)
packages/
  db/       @winlab/db     — Supabase types + database.types.ts
  domain/   @winlab/domain — pure composers (recruitment / profile records)
```

Both apps import shared logic from `packages/*` via workspace aliases
(`@winlab/db`, `@winlab/domain`). Each Vercel project sets
`transpilePackages: ["@winlab/db", "@winlab/domain"]` so source TS is
picked up without a build step.

## Vercel

Two projects on the same `ai.winlab.tw` repo:

| Project | rootDirectory | Domain |
|---------|---------------|--------|
| `ai`    | `apps/web`    | ai.winlab.tw |
| `mcp.ai.winlab.tw` | `apps/mcp` | mcp.ai.winlab.tw |

Both deploy from `main`. No `ignoreCommand` for now — builds are fast
enough that running both per push is fine; add `turbo-ignore` when
deploys start to feel expensive.

## Working commands

From repo root:

```bash
bun install                       # install once, hoists into ./node_modules
bun run --filter '*' check        # test + typecheck across all workspaces
bun run --filter '@winlab/web' dev   # run only the web app
bun run --filter '@winlab/mcp' dev   # run only the mcp server (currently named "mcp.ai.winlab.tw" in package.json)
```

Or `cd apps/<name>` and use the app's own scripts (`bun dev`, `bun run check`).

## Schema regen

`bun run gen:types` from `apps/web` writes to `packages/db/src/database.types.ts`.
Single source — both apps pick it up automatically.

## Conventions

- New shared logic → `packages/domain` (if pure) or `packages/db` (if Supabase typing)
- New app-specific UI / routes → `apps/web` or `apps/mcp`
- `packages/db` must NEVER import `next/headers` (would poison the MCP token-bound client)
- `packages/domain` must NEVER import Next or React (pure functions only)

## Per-app docs

- `apps/web/CLAUDE.md` — full web-app conventions (auth, ISR, design system, hooks)
- `apps/mcp/AGENTS.md` — MCP server architecture + OAuth flow
- `apps/web/rules/*` + `apps/mcp/rules/*` — topic-specific rules (RLS, storage, etc.)

## Migration history

Pre-2026-05: two separate repos (`ai.winlab.tw` + `mcp.ai.winlab.tw`)
with manually-synced `database.types.ts` and drifting `recruitment-records` /
`profile-records`. Merged 2026-05-12 into this monorepo to stop the drift.
Original mcp.ai.winlab.tw repo is read-only / archived; do not commit
there anymore.
