# MCP OAuth Discovery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the remote MCP server discoverable and login-capable for OAuth clients such as Codex while preserving Supabase as the token source.

**Architecture:** Add MCP/OAuth discovery routes and shared auth helpers in `lib/auth/`, persist registered OAuth clients in Supabase, and keep the existing `/mcp` bearer-token model. Update existing OAuth routes to validate against stored client metadata and emit predictable OAuth-compatible responses.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Supabase, Bun

---

## Chunk 1: Discovery Contracts

### Task 1: Add failing tests for OAuth metadata and MCP auth headers

**Files:**
- Create: `lib/auth/oauth-metadata.test.ts`
- Modify: `app/mcp/route.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run the targeted tests to verify they fail for the expected missing metadata/header behavior**
- [ ] **Step 3: Implement the minimal metadata and header changes**
- [ ] **Step 4: Re-run the targeted tests to verify they pass**
- [ ] **Step 5: Commit**

### Task 2: Add well-known discovery routes

**Files:**
- Create: `app/.well-known/oauth-authorization-server/route.ts`
- Create: `app/.well-known/oauth-protected-resource/mcp/route.ts`
- Modify: `lib/auth/oauth-metadata.ts`

- [ ] **Step 1: Write the failing tests or route-level assertions for the discovery payloads**
- [ ] **Step 2: Run the targeted tests to verify they fail**
- [ ] **Step 3: Implement the new route handlers and shared metadata helper updates**
- [ ] **Step 4: Re-run targeted tests to verify they pass**
- [ ] **Step 5: Commit**

## Chunk 2: Client Registration and Validation

### Task 3: Add failing tests for client registration persistence and lookups

**Files:**
- Create: `lib/auth/oauth-clients.ts`
- Create: `lib/auth/oauth-clients.test.ts`
- Modify: `app/oauth/register/route.ts`

- [ ] **Step 1: Write failing tests for validated registration input and stored client lookups**
- [ ] **Step 2: Run the targeted tests to verify they fail**
- [ ] **Step 3: Implement minimal client persistence helpers and update the registration route**
- [ ] **Step 4: Re-run the targeted tests to verify they pass**
- [ ] **Step 5: Commit**

### Task 4: Add the database migration and generated type updates

**Files:**
- Create: Supabase migration for `oauth_clients`
- Modify: `lib/supabase/types.ts` if generated types are committed in this repo

- [ ] **Step 1: Create the migration with the minimum client registration schema**
- [ ] **Step 2: Update any required TypeScript types or helper assumptions**
- [ ] **Step 3: Verify the migration file and related types are internally consistent**
- [ ] **Step 4: Commit**

## Chunk 3: OAuth Flow Hardening

### Task 5: Add failing tests for authorize/token validation

**Files:**
- Create: `lib/auth/oauth-request.test.ts`
- Create: `lib/auth/oauth-request.ts`
- Modify: `app/oauth/authorize/page.tsx`
- Modify: `app/oauth/callback/route.ts`
- Modify: `app/oauth/token/route.ts`

- [ ] **Step 1: Write failing tests for `client_id`, `redirect_uri`, and PKCE validation**
- [ ] **Step 2: Run the targeted tests to verify they fail**
- [ ] **Step 3: Implement shared request-validation helpers and update the routes**
- [ ] **Step 4: Re-run the targeted tests to verify they pass**
- [ ] **Step 5: Commit**

### Task 6: Verify the end-to-end contract and update docs

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md` only if repo-wide agent guidance changes

- [ ] **Step 1: Update README discovery/auth notes if endpoint behavior changes materially**
- [ ] **Step 2: Run targeted verification (`bun test` if available, otherwise project-appropriate targeted checks)**
- [ ] **Step 3: Run a fresh route/helper verification pass for all changed files**
- [ ] **Step 4: Commit**
