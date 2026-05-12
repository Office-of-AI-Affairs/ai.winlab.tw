# OAuth Clients Anon Registration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `SUPABASE_SERVICE_ROLE_KEY` requirement from OAuth client registration by making `oauth_clients` safely writable and readable through the anon Supabase client.

**Architecture:** Keep `oauth_clients` as a minimal public registration table, but enforce strict RLS so only inserts and minimal reads are allowed. Update the OAuth client store helper to use the anon Supabase client instead of the service-role helper.

**Tech Stack:** Next.js App Router, Supabase, Zod, Bun test, TypeScript

---

## Chunk 1: Helper And Route Wiring

### Task 1: Update the OAuth client store to avoid service role

**Files:**
- Modify: `lib/auth/oauth-clients.ts`
- Modify: `lib/auth/oauth-clients.test.ts`

- [ ] **Step 1: Write or adjust tests to verify the store no longer depends on service-role-only behavior**
- [ ] **Step 2: Run the targeted tests**
- [ ] **Step 3: Update the store to use an anon-safe Supabase client path**
- [ ] **Step 4: Re-run the targeted tests**
- [ ] **Step 5: Commit**

## Chunk 2: Database Policy

### Task 2: Harden `oauth_clients` with RLS

**Files:**
- Modify: `supabase/migrations/20260318090000_add_oauth_clients.sql`

- [ ] **Step 1: Add RLS enablement and minimal insert/select policies**
- [ ] **Step 2: Keep update/delete disallowed**
- [ ] **Step 3: Verify the migration remains internally consistent with route behavior**
- [ ] **Step 4: Commit**

## Chunk 3: Final Verification

### Task 3: Re-run the local contract suite

**Files:**
- Modify: `README.md` only if environment assumptions change materially

- [ ] **Step 1: Run smoke and targeted tests**
- [ ] **Step 2: Run `bun lint`**
- [ ] **Step 3: Run `bunx tsc --noEmit`**
