# Edit Page State Loss Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent edit pages from losing unsaved changes when users switch browser tabs and return.

**Architecture:** Two-part fix — (1) stabilize AuthProvider so token refreshes don't trigger downstream re-renders, (2) add a shared `useAutoSave` hook for debounced auto-saving with beforeunload protection.

**Tech Stack:** React hooks, Supabase auth, Next.js App Router

---

### Task 1: Stabilize AuthProvider — prevent unnecessary re-renders on token refresh

**Files:**
- Modify: `components/auth-provider.tsx:27-106`

**Step 1: Add useRef import and userIdRef**

In `components/auth-provider.tsx`, add `useRef` to the React import and create a ref to track the current user ID.

Change the import (line 8):
```typescript
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
```

Inside `AuthProvider`, after `const [isLoading, setIsLoading] = useState(true);` (line 30), add:
```typescript
  const userIdRef = useRef<string | null>(null);
```

**Step 2: Update getUser to use the ref**

In the `getUser` function inside the `useEffect` (lines 73-84), update `userIdRef` when setting user:

Replace:
```typescript
    const getUser = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);
      if (u?.id) {
        await fetchProfile(u.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    };
```

With:
```typescript
    const getUser = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      userIdRef.current = u?.id ?? null;
      setUser(u);
      if (u?.id) {
        await fetchProfile(u.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    };
```

**Step 3: Guard onAuthStateChange against same-user token refreshes**

Replace the `onAuthStateChange` callback (lines 90-101):

Replace:
```typescript
    } = supabase.auth.onAuthStateChange((event, session) => {
      // During password recovery, do not update auth state —
      // the reset-password page handles this flow independently.
      if (event === "PASSWORD_RECOVERY") return;
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });
```

With:
```typescript
    } = supabase.auth.onAuthStateChange((event, session) => {
      // During password recovery, do not update auth state —
      // the reset-password page handles this flow independently.
      if (event === "PASSWORD_RECOVERY") return;

      const newUserId = session?.user?.id ?? null;

      // Skip if user hasn't actually changed (e.g. token refresh on tab focus).
      // This prevents unnecessary re-renders that reset edit page state.
      if (newUserId === userIdRef.current) {
        setIsLoading(false);
        return;
      }

      userIdRef.current = newUserId;
      setUser(session?.user ?? null);
      if (newUserId) {
        fetchProfile(newUserId);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });
```

**Step 4: Verify — run dev server and test**

Run: `bun dev`

Manual test:
1. Log in, navigate to any edit page (e.g. `/events/ai-rising-star/results/.../edit`)
2. Type something in the editor
3. Switch to another browser tab, wait 5 seconds, switch back
4. Verify: your edits are still there (not reset to DB value)

**Step 5: Commit**

```bash
git add components/auth-provider.tsx
git commit -m "fix: stabilize AuthProvider to prevent re-renders on token refresh"
```

---

### Task 2: Create useAutoSave hook

**Files:**
- Create: `hooks/use-auto-save.ts`

**Step 1: Create the hooks directory and hook file**

Create `hooks/use-auto-save.ts`:

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** The save function to call */
  onSave: () => Promise<void>;
  /** Debounce delay in ms (default: 3000) */
  delay?: number;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
}

export function useAutoSave({
  hasChanges,
  onSave,
  delay = 3000,
  enabled = true,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const isSavingRef = useRef(false);

  // Keep onSave ref fresh without re-triggering effects
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Cancel any pending auto-save
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Debounced auto-save: when hasChanges becomes/stays true, start timer
  useEffect(() => {
    if (!enabled || !hasChanges) {
      cancel();
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        await onSaveRef.current();
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    return cancel;
  }, [hasChanges, enabled, delay, cancel]);

  // beforeunload warning when there are unsaved changes
  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);
}
```

**Step 2: Verify — run lint**

Run: `bun lint`
Expected: No errors in `hooks/use-auto-save.ts`

**Step 3: Commit**

```bash
git add hooks/use-auto-save.ts
git commit -m "feat: add useAutoSave hook with debounced save and beforeunload warning"
```

---

### Task 3: Integrate useAutoSave into all edit pages

**Files (10 pages — skip `privacy/edit`):**
- Modify: `app/events/[slug]/results/[id]/edit/page.tsx`
- Modify: `app/events/[slug]/announcements/[id]/edit/page.tsx`
- Modify: `app/events/[slug]/recruitment/[id]/edit/page.tsx`
- Modify: `app/events/[slug]/edit/page.tsx`
- Modify: `app/announcement/[id]/edit/page.tsx`
- Modify: `app/recruitment/[id]/edit/page.tsx`
- Modify: `app/introduction/edit/page.tsx`
- Modify: `app/organization/[id]/edit/page.tsx`
- Modify: `app/carousel/[id]/edit/page.tsx`
- Modify: `app/contacts/[id]/edit/page.tsx`

**Step 1: Add useAutoSave to each edit page**

For each of the 10 files listed above, make two changes:

1. Add import at the top:
```typescript
import { useAutoSave } from "@/hooks/use-auto-save";
```

2. Add the hook call inside the component, after `handleSave` is defined and after `hasChanges` is computed:
```typescript
useAutoSave({ hasChanges, onSave: handleSave });
```

**Step 2: Verify — run lint**

Run: `bun lint`
Expected: No new errors

**Step 3: Verify — run dev server and test**

Run: `bun dev`

Manual test on one page (e.g. `/events/ai-rising-star/results/.../edit`):
1. Type something, wait 3+ seconds → button should change from "儲存" to "已儲存" (auto-saved)
2. Type something, try to close the tab → browser should show "Leave site?" dialog
3. Type something, manually click "儲存" → should save immediately, no double-save

**Step 4: Commit**

```bash
git add app/events/\[slug\]/results/\[id\]/edit/page.tsx \
  app/events/\[slug\]/announcements/\[id\]/edit/page.tsx \
  app/events/\[slug\]/recruitment/\[id\]/edit/page.tsx \
  app/events/\[slug\]/edit/page.tsx \
  app/announcement/\[id\]/edit/page.tsx \
  app/recruitment/\[id\]/edit/page.tsx \
  app/introduction/edit/page.tsx \
  app/organization/\[id\]/edit/page.tsx \
  app/carousel/\[id\]/edit/page.tsx \
  app/contacts/\[id\]/edit/page.tsx
git commit -m "feat: integrate useAutoSave into all edit pages"
```

---

### Task 4: Final verification

**Step 1: Run full lint**

Run: `bun lint`
Expected: No errors

**Step 2: Run build**

Run: `bun build`
Expected: Build succeeds with no errors

**Step 3: End-to-end manual test**

Test the full flow:
1. Log in, go to a result edit page
2. Make edits (title, content, summary)
3. Switch tabs, wait 5+ seconds, switch back → edits preserved
4. Wait 3 seconds after editing → auto-save triggers (button shows "已儲存")
5. Make a change, try closing tab → beforeunload warning appears
6. Repeat step 3 on announcement edit page to verify

**Step 4: Commit (if any fixes needed)**

Only commit if fixes were made during verification.
