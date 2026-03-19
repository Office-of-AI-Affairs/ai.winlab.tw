# Notion-Like Editor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current fixed-toolbar Tiptap editor into a canvas-first editor with desktop contextual menus and a separate mobile interaction model.

**Architecture:** Keep `TiptapEditor` as the integration shell, but split desktop and mobile controls into separate components with shared command helpers. Prioritize read/edit canvas parity first, then replace the fixed bottom toolbar on desktop with `BubbleMenu` and `FloatingMenu`, while keeping a compact mobile toolbar.

**Tech Stack:** Next.js App Router, React, Tiptap, Tailwind CSS v4, shadcn/ui, Bun, Node test runner

---

## Chunk 1: Shared Canvas Parity

### Task 1: Lock the current anti-goal in tests

**Files:**
- Modify: `lib/ui/accessibility-contracts.test.ts`
- Modify: `lib/ui/render-contracts.test.tsx`

- [ ] **Step 1: Write the failing test**
  Add assertions that the editor no longer relies on a fixed bottom toolbar as the primary desktop interaction model.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/accessibility-contracts.test.ts lib/ui/render-contracts.test.tsx`
  Expected: FAIL because `components/tiptap-editor.tsx` still renders a fixed bottom toolbar.

- [ ] **Step 3: Implement the minimal code to move toward parity**
  Refactor `components/tiptap-editor.tsx` so the canvas remains the main surface and the fixed toolbar can be removed in later tasks without changing external props.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/accessibility-contracts.test.ts lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add lib/ui/accessibility-contracts.test.ts lib/ui/render-contracts.test.tsx components/tiptap-editor.tsx
  git commit -m "refactor: prepare tiptap editor for contextual controls"
  ```

### Task 2: Align editor typography with read mode

**Files:**
- Modify: `components/tiptap-editor.tsx`
- Check: `components/result-detail.tsx`
- Check: `components/introduction-detail.tsx`

- [ ] **Step 1: Write the failing test**
  Add render-contract assertions for the editor canvas typography classes and spacing so they mirror read mode more closely.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: FAIL because the editor canvas does not yet match the agreed typography contract.

- [ ] **Step 3: Write minimal implementation**
  Update canvas classes and wrappers in `components/tiptap-editor.tsx` to align headings, lists, media, and content width with read-mode presentation.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add components/tiptap-editor.tsx lib/ui/render-contracts.test.tsx
  git commit -m "style: align tiptap canvas with read mode typography"
  ```

## Chunk 2: Desktop Contextual Controls

### Task 3: Extract shared command helpers

**Files:**
- Create: `components/tiptap-editor-shared.ts`
- Modify: `components/tiptap-editor.tsx`

- [ ] **Step 1: Write the failing test**
  Add a render or structure test that expects desktop and mobile editor controls to reuse shared command definitions instead of duplicating button logic.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: FAIL because shared helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**
  Move shared command metadata and action helpers into `components/tiptap-editor-shared.ts`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add components/tiptap-editor.tsx components/tiptap-editor-shared.ts lib/ui/render-contracts.test.tsx
  git commit -m "refactor: extract shared tiptap command helpers"
  ```

### Task 4: Add desktop BubbleMenu

**Files:**
- Create: `components/tiptap-desktop-bubble-menu.tsx`
- Modify: `components/tiptap-editor.tsx`
- Test: `lib/ui/render-contracts.test.tsx`

- [ ] **Step 1: Write the failing test**
  Add tests expecting a desktop-only bubble menu component to render the inline formatting controls.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Write minimal implementation**
  Introduce a `BubbleMenu` wrapper that renders inline controls for desktop.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add components/tiptap-editor.tsx components/tiptap-desktop-bubble-menu.tsx lib/ui/render-contracts.test.tsx
  git commit -m "feat: add desktop tiptap bubble menu"
  ```

### Task 5: Add desktop FloatingMenu for block insertion

**Files:**
- Create: `components/tiptap-desktop-floating-menu.tsx`
- Modify: `components/tiptap-editor.tsx`
- Test: `lib/ui/render-contracts.test.tsx`

- [ ] **Step 1: Write the failing test**
  Add tests for a block-level desktop floating menu that exposes heading, list, image, and YouTube actions.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: FAIL because the floating menu does not exist yet.

- [ ] **Step 3: Write minimal implementation**
  Add a simplified desktop block insertion menu for empty block contexts.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add components/tiptap-editor.tsx components/tiptap-desktop-floating-menu.tsx lib/ui/render-contracts.test.tsx
  git commit -m "feat: add desktop tiptap floating menu"
  ```

## Chunk 3: Mobile-Specific Editing UI

### Task 6: Add compact mobile toolbar

**Files:**
- Create: `components/tiptap-mobile-toolbar.tsx`
- Modify: `components/tiptap-editor.tsx`
- Test: `lib/ui/render-contracts.test.tsx`

- [ ] **Step 1: Write the failing test**
  Add tests expecting a mobile-only toolbar component with compact high-frequency controls.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Write minimal implementation**
  Replace the one-size-fits-all bottom toolbar with a mobile-specific compact toolbar.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add components/tiptap-editor.tsx components/tiptap-mobile-toolbar.tsx lib/ui/render-contracts.test.tsx
  git commit -m "feat: add mobile tiptap toolbar"
  ```

### Task 7: Add mobile block insertion entry

**Files:**
- Modify: `components/tiptap-mobile-toolbar.tsx`
- Test: `lib/ui/render-contracts.test.tsx`

- [ ] **Step 1: Write the failing test**
  Add tests expecting a `+` entry in the mobile toolbar for block-level actions.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: FAIL because no such entry exists yet.

- [ ] **Step 3: Write minimal implementation**
  Add a compact `+` entry that opens block insertion controls on mobile.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add components/tiptap-mobile-toolbar.tsx lib/ui/render-contracts.test.tsx
  git commit -m "feat: add mobile block insertion entry"
  ```

## Chunk 4: Editor Route Integration and Cleanup

### Task 8: Remove reliance on preview-first editing flows

**Files:**
- Modify: `app/announcement/[id]/edit/client.tsx`
- Modify: `app/events/[slug]/announcements/[id]/edit/client.tsx`
- Modify: `app/events/[slug]/results/[id]/edit/client.tsx`
- Modify: `app/introduction/edit/client.tsx`
- Modify: `app/privacy/edit/client.tsx`

- [ ] **Step 1: Write the failing test**
  Add contract tests around editor route structure so the main edit view is the primary surface and preview is secondary.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/accessibility-contracts.test.ts lib/ui/render-contracts.test.tsx`
  Expected: FAIL because routes still assume the old split interaction model.

- [ ] **Step 3: Write minimal implementation**
  Update the editor routes so the new contextual editor is the primary interaction surface. Keep preview only where still necessary.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/accessibility-contracts.test.ts lib/ui/render-contracts.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add app/announcement/[id]/edit/client.tsx app/events/[slug]/announcements/[id]/edit/client.tsx app/events/[slug]/results/[id]/edit/client.tsx app/introduction/edit/client.tsx app/privacy/edit/client.tsx lib/ui/accessibility-contracts.test.ts lib/ui/render-contracts.test.tsx
  git commit -m "refactor: integrate notion-like tiptap editor routes"
  ```

### Task 9: Update repository guidance

**Files:**
- Modify: `AGENTS.md`
- Modify: `lib/ui/patterns.test.ts`

- [ ] **Step 1: Write the failing test**
  Add tests for the new editor interaction guidance: desktop contextual controls, mobile-specific toolbar, managed focus, and canvas parity.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test lib/ui/patterns.test.ts`
  Expected: FAIL because docs/tests do not yet describe the new editor model.

- [ ] **Step 3: Write minimal implementation**
  Document the editor interaction architecture in `AGENTS.md` and align pattern tests.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test lib/ui/patterns.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add AGENTS.md lib/ui/patterns.test.ts
  git commit -m "docs: record notion-like editor interaction rules"
  ```

## Final Verification

- [ ] Run: `bun test lib/app/server-admin-pages.test.ts lib/ui/patterns.test.ts lib/ui/accessibility-contracts.test.ts lib/ui/render-contracts.test.tsx`
- [ ] Expected: all pass
- [ ] Run: `bun run typecheck`
- [ ] Expected: exit 0
- [ ] Run: `bun run lint`
- [ ] Expected: exit 0
