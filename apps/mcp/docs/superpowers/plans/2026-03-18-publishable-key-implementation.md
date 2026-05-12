# Publishable Key Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support Supabase publishable keys as the primary public key input while preserving backward compatibility with the older anon-key environment variable.

**Architecture:** Centralize the public Supabase key lookup in shared client helpers, preferring `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and falling back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Update documentation so deployment guidance matches the new preferred key model.

**Tech Stack:** Next.js, TypeScript, Bun test, ESLint

---

## Chunk 1: Public Key Resolution

### Task 1: Update the shared Supabase helpers

**Files:**
- Modify: `lib/supabase/client.ts`
- Modify: `lib/supabase/server.ts`

- [ ] **Step 1: Update shared public-key resolution to prefer the publishable env**
- [ ] **Step 2: Preserve anon-key fallback**
- [ ] **Step 3: Run targeted verification**
- [ ] **Step 4: Commit**

## Chunk 2: Documentation

### Task 2: Update environment variable guidance

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Document the new preferred env name**
- [ ] **Step 2: Note anon-key fallback compatibility**
- [ ] **Step 3: Re-run smoke tests, lint, and TypeScript verification**
- [ ] **Step 4: Commit**
