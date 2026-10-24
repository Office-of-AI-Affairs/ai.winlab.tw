# CLAUDE.md (monorepo root)

bun workspaces monorepo for the WinLab AI Office stack.

## Layout

```
apps/
  web/      Next.js web app + MCP server — ai.winlab.tw, MCP at /mcp  (CLAUDE.md inside)
packages/
  db/       @winlab/db     — Supabase types + database.types.ts
  domain/   @winlab/domain — pure composers (recruitment / profile records)
```

`apps/web` imports shared logic from `packages/*` via workspace aliases
(`@winlab/db`, `@winlab/domain`) and sets
`transpilePackages: ["@winlab/db", "@winlab/domain"]` so source TS is
picked up without a build step.

## Deploy

`apps/web` runs on the Carrel machine `ai` (tenant `winfra`) as a Next.js
standalone server (`node apps/web/server.js`, port 3000).

- Every push to `main` runs `.github/workflows/carrel.yml`: it builds,
  packs `.next/standalone` and ships it with `NYCU-WinLab/carrel-deploy`.
- `carrel-deployd` on the machine switches the release and rolls back if
  `http://127.0.0.1:3000/` is unhealthy. Roll back by hand with the Carrel
  `app_rollback` tool.
- Runtime secrets live in `/srv/apps/ai/env` on the machine.
- `mcp.ai.winlab.tw` points at the same machine. It still serves `/mcp`,
  `/oauth/*`, `/.well-known/*` and `/api/upload` (a cross-origin redirect
  would drop the MCP client's Authorization header), and the OAuth server
  accepts its old resource URL. Every other path 308-redirects to
  `ai.winlab.tw` (`next.config.ts`).

## Working commands

From repo root:

```bash
bun install                       # install once, hoists into ./node_modules
bun run --filter '*' check        # test + typecheck across all workspaces
bun run --filter '@winlab/web' dev   # run only the web app
```

Or `cd apps/<name>` and use the app's own scripts (`bun dev`, `bun run check`).

## Schema regen

`bun run gen:types` from `apps/web` writes to `packages/db/src/database.types.ts`.
Single source for the whole repo.

## Conventions

- New shared logic → `packages/domain` (if pure) or `packages/db` (if Supabase typing)
- New UI / routes → `apps/web`; MCP tools → `apps/web/lib/mcp/tools/`
- `packages/db` must NEVER import `next/headers` (would poison the MCP token-bound client)
- `packages/domain` must NEVER import Next or React (pure functions only)

## Per-app docs

- `apps/web/CLAUDE.md` — full web-app conventions (auth, ISR, design system, hooks)
- `apps/web/docs/mcp/README.md` — MCP server architecture + OAuth flow
- `apps/web/docs/mcp/rules/*` — MCP topic-specific rules

## Migration history

Pre-2026-05: two separate repos (`ai.winlab.tw` + `mcp.ai.winlab.tw`)
with manually-synced `database.types.ts` and drifting `recruitment-records` /
`profile-records`. Merged 2026-05-12 into this monorepo to stop the drift.
Original mcp.ai.winlab.tw repo is read-only / archived; do not commit
there anymore.

2026-10: `apps/mcp` folded into `apps/web` (routes `/mcp`, `/oauth/*`,
`/.well-known/*`, `/api/upload`; code in `lib/mcp/`), and both left Vercel
for Carrel.
