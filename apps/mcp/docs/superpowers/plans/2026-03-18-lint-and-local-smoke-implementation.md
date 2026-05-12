# Lint And Local Smoke Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a working lint baseline and add a local smoke test for MCP discovery and OAuth contract validation without requiring Supabase credentials.

**Architecture:** Keep the lint fix minimal by introducing a flat ESLint config for Next.js 16 and explicit ignore patterns. Add a single smoke test file that exercises existing route handlers and auth helpers without hitting Supabase-backed login operations.

**Tech Stack:** Next.js App Router, ESLint 9 flat config, Bun test, TypeScript

---

## Chunk 1: Local Smoke Coverage

### Task 1: Add the failing smoke test

**Files:**
- Create: `app/oauth/smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test for discovery metadata, 401 challenge, and OAuth request helper contracts**
- [ ] **Step 2: Run the smoke test to verify it fails if the contract regresses**
- [ ] **Step 3: Make only the minimum changes needed to keep the smoke test green**
- [ ] **Step 4: Re-run the smoke test**
- [ ] **Step 5: Commit**

## Chunk 2: Lint Baseline

### Task 2: Add ESLint flat config

**Files:**
- Create: `eslint.config.mjs`

- [ ] **Step 1: Add a minimal ESLint 9 flat config for Next.js**
- [ ] **Step 2: Ignore generated and non-source paths that should not be linted**
- [ ] **Step 3: Run `bun lint` and fix only errors introduced by the new config**
- [ ] **Step 4: Re-run lint to verify it passes**
- [ ] **Step 5: Commit**

## Chunk 3: Final Verification

### Task 3: Verify the combined change

**Files:**
- Modify: `README.md` only if commands or verification notes need updating

- [ ] **Step 1: Run the smoke test, full targeted tests, lint, and `bunx tsc --noEmit`**
- [ ] **Step 2: Confirm git diff is clean of formatting or whitespace issues**
- [ ] **Step 3: Commit any remaining documentation or verification-related updates**
