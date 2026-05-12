# AGENTS.md

This file is the entry point for coding agents working in this repository. Follow the repo-level rules here first, then read the referenced files in `rules/` before making changes.

## Project Overview

- Product: `mcp.ai.winlab.tw`
- Purpose: a stateless MCP server for AI agents, exposed over Streamable HTTP at `/mcp`
- Stack: Next.js 16 App Router, React 19, TypeScript, Supabase, Zod
- Package manager: use `bun`
- Runtime shape: route handlers in `app/`, implementation logic in `lib/`

## Setup Commands

- Install dependencies: `bun install`
- Start dev server: `bun dev`
- Build production bundle: `bun build`
- Start production server: `bun start`
- Run lint: `bun lint`
- Run unit tests: `bun run test`
- Run typecheck: `bun run typecheck`
- Run the full pre-push check (mirrors CI): `bun run check`
- Regenerate `lib/supabase/database.types.ts` from the live schema:
  `bun run gen:types` (requires `SUPABASE_ACCESS_TOKEN` — see
  `rules/database-types.md`)

## Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=
```

Tooling-only (not needed at runtime):

```bash
SUPABASE_ACCESS_TOKEN=    # for `bun run gen:types`
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as a fallback for older deployments, but new deployments should prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Architecture Summary

- `app/mcp/route.ts` authenticates the bearer token, creates the MCP server, and hands the request to the transport.
- `lib/mcp/server.ts` is the MCP composition root. Register new tool groups there.
- `lib/tools/*.ts` contains domain-specific MCP tool registration modules.
- `app/oauth/*` and `lib/auth/*` implement OAuth-related endpoints and PKCE helpers.
- `app/api/upload/route.ts` handles authenticated and one-time-token uploads into Supabase Storage.
- `lib/supabase/*` contains Supabase client creation and shared types.

## Required Reading

- Architecture and boundaries: `rules/architecture.md`
- Coding conventions: `rules/coding-style.md`
- Documentation maintenance: `rules/documentation.md`
- Git workflow: `rules/git.md`
- Database types workflow: `rules/database-types.md`

## Working Rules

- Prefer small route handlers that validate/authenticate requests and delegate the main behavior to `lib/`.
- Keep MCP tools grouped by content domain. Extend an existing file when behavior belongs to that domain; add a new `lib/tools/<domain>.ts` file only for a genuinely new domain.
- Preserve the current server-first style. This repo is not a rich UI app; avoid introducing client-side state or UI abstractions unless the product scope changes.
- Validate all external input at the boundary, and return explicit JSON error responses for invalid auth, invalid payloads, and upstream Supabase failures.
- Keep `AGENTS.md`, `rules/*.md`, and `README.md` aligned when project capabilities or operating assumptions change.
- Follow `rules/git.md` for topic-based commits and push behavior.
- Sibling app repo: `~/ai.winlab.tw`
  (`Office-of-AI-Affairs/ai.winlab.tw`). Both repos share **one**
  Supabase project, so `lib/supabase/database.types.ts` must stay
  byte-identical across the two. When the main app changes Supabase
  tables, RLS, content models, or admin workflows, regenerate types
  and sanity-check every affected MCP tool — see
  `rules/database-types.md` for the regen flow.
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + unit tests
  on every push and PR. Keep `bun run check` green locally before
  pushing.

## Maintenance Note

- Update this file when repo-wide agent instructions change.
- Put durable, topic-specific guidance in `rules/*.md` instead of expanding this file into a long checklist.
