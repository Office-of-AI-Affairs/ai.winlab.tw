# AGENTS.md

This file is the entry point for coding agents working in this repository. Follow the repo-level rules here first, then read the referenced files in `docs/mcp/rules/` before making changes.

## Project Overview

- Product: the MCP server of `ai.winlab.tw`, at `https://ai.winlab.tw/mcp`
- Purpose: a stateless MCP server for AI agents, exposed over Streamable HTTP at `/mcp`
- Stack: Next.js 16 App Router, React 19, TypeScript, Supabase, Zod
- Package manager: use `bun` from the monorepo root
- Runtime shape: route handlers in `app/`, implementation logic in `lib/`

## Setup Commands

- Install dependencies from the repo root: `bun install --frozen-lockfile`
- Start dev server from the repo root: `bun run --filter @winlab/web dev`
- Build production bundle from the repo root: `bun run --filter @winlab/web build`
- Start production server from the repo root: `bun run --filter @winlab/web start`
- Run lint from the repo root: `bun run --filter @winlab/web lint`
- Run unit tests from the repo root: `bun run --filter @winlab/web test`
- Run typecheck from the repo root: `bun run --filter @winlab/web typecheck`
- Run the full pre-push check from the repo root (mirrors CI):
  `bun run --filter @winlab/web check`
- Regenerate `packages/db/src/database.types.ts` from the live schema:
  `bun run --filter @winlab/web gen:types` (requires
  `SUPABASE_ACCESS_TOKEN` — see `docs/mcp/rules/database-types.md`)

## Environment Variables

The MCP server shares the web app's environment. It needs:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=     # optional, defaults to https://ai.winlab.tw
```

Tooling-only (not needed at runtime):

```bash
SUPABASE_ACCESS_TOKEN=    # for `bun run --filter @winlab/web gen:types`
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` remain supported as fallbacks.

## Architecture Summary

- `app/mcp/route.ts` authenticates the bearer token, creates the MCP server, and hands the request to the transport.
- `lib/mcp/server.ts` is the MCP composition root. Register new tool groups there.
- `lib/mcp/tools/*.ts` contains domain-specific MCP tool registration modules.
- `app/oauth/*` and `lib/mcp/auth/*` implement OAuth-related endpoints and PKCE helpers.
- `app/api/upload/route.ts` handles authenticated and one-time-token uploads into Supabase Storage.
- `lib/mcp/supabase/*` contains Supabase client creation and shared types.

## Required Reading

- Architecture and boundaries: `docs/mcp/rules/architecture.md`
- Coding conventions: `docs/mcp/rules/coding-style.md`
- Documentation maintenance: `docs/mcp/rules/documentation.md`
- Git workflow: `docs/mcp/rules/git.md`
- Database types workflow: `docs/mcp/rules/database-types.md`

## Working Rules

- Prefer small route handlers that validate/authenticate requests and delegate the main behavior to `lib/`.
- Keep MCP tools grouped by content domain. Extend an existing file when behavior belongs to that domain; add a new `lib/mcp/tools/<domain>.ts` file only for a genuinely new domain.
- Preserve the current server-first style. This repo is not a rich UI app; avoid introducing client-side state or UI abstractions unless the product scope changes.
- Validate all external input at the boundary, and return explicit JSON error responses for invalid auth, invalid payloads, and upstream Supabase failures.
- Keep `AGENTS.md`, `docs/mcp/rules/*.md`, and `README.md` aligned when project capabilities or operating assumptions change.
- Follow `docs/mcp/rules/git.md` for topic-based commits and push behavior.
- Lives inside `apps/web` (same Next.js app as ai.winlab.tw since 2026-10).
  Supabase types + domain composers come from `packages/{db,domain}` via
  `@winlab/db` and `@winlab/domain` — they are the single source of truth.
  Schema regen happens once in `packages/db/src/database.types.ts` and
  both apps pick it up automatically.
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + unit tests
  from the monorepo root on every push and PR. Keep
  `bun run --filter @winlab/web check` green locally before pushing.

## Maintenance Note

- Update this file when repo-wide agent instructions change.
- Put durable, topic-specific guidance in `docs/mcp/rules/*.md` instead of expanding this file into a long checklist.
