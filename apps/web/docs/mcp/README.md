# AGENTS.md

This file is the entry point for coding agents working in this repository. Follow the repo-level rules here first, then read the referenced files in `docs/mcp/rules/` before making changes.

## Project Overview

- Product: the MCP server of `ai.winlab.tw`, at `https://ai.winlab.tw/mcp`
- Purpose: a stateless MCP server for AI agents, exposed over Streamable HTTP at `/mcp`
- Stack: Next.js 16 App Router, React 19, TypeScript, Postgres + Drizzle, Better Auth, Zod
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

## Environment Variables

The MCP server shares the web app's environment (`DATABASE_URL`,
`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`; see `apps/web/CLAUDE.md`).

## Architecture Summary

- Better Auth is the OAuth 2.1 authorization server (`jwt`, `mcp`, `cimd` plugins in `lib/auth/index.ts`): dynamic client registration and CIMD, PKCE, refresh tokens, consent at `/oauth/consent`, discovery under `/.well-known/`.
- `app/mcp/route.ts` checks the bearer token with `requireMcpAuth`, loads the user, and runs the MCP server inside `runAsViewer(viewer)`.
- `lib/mcp/server.ts` is the MCP composition root. Register new tool groups there.
- `lib/mcp/tools/*.ts` register the tools. They call the site's server actions (`lib/actions/*`), so the permission rules in `lib/permissions/rows.ts` apply to MCP exactly as to the site. Never query around them.
- `app/api/upload/route.ts` takes one-time-token or bearer uploads into the `files` table through `lib/files/upload.ts`.

## Required Reading

- Architecture and boundaries: `docs/mcp/rules/architecture.md`
- Coding conventions: `docs/mcp/rules/coding-style.md`
- Documentation maintenance: `docs/mcp/rules/documentation.md`
- Git workflow: `docs/mcp/rules/git.md`

## Working Rules

- Prefer small route handlers that validate/authenticate requests and delegate the main behavior to `lib/`.
- Keep MCP tools grouped by content domain. Extend an existing file when behavior belongs to that domain; add a new `lib/mcp/tools/<domain>.ts` file only for a genuinely new domain.
- Preserve the current server-first style. This repo is not a rich UI app; avoid introducing client-side state or UI abstractions unless the product scope changes.
- Validate all external input at the boundary, and return explicit JSON error responses for invalid auth and invalid payloads.
- Keep `AGENTS.md`, `docs/mcp/rules/*.md`, and `README.md` aligned when project capabilities or operating assumptions change.
- Follow `docs/mcp/rules/git.md` for topic-based commits and push behavior.
- Lives inside `apps/web` (same Next.js app as ai.winlab.tw since 2026-10).
  Row types and domain composers come from `packages/{db,domain}`.
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + unit tests
  from the monorepo root on every push and PR. Keep
  `bun run --filter @winlab/web check` green locally before pushing.

## Maintenance Note

- Update this file when repo-wide agent instructions change.
- Put durable, topic-specific guidance in `docs/mcp/rules/*.md` instead of expanding this file into a long checklist.
