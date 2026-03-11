# Edit Page State Loss on Tab Switch — Design

**Date:** 2026-03-11
**Problem:** Switching browser tabs and returning causes edit pages to reset to last-saved DB state, losing unsaved changes.

## Root Cause

1. Supabase auto-refreshes auth tokens when a tab regains focus
2. `onAuthStateChange` in AuthProvider fires → `setUser()` creates new object reference
3. Edit page's `useEffect([user, ...])` sees new `user` reference → re-runs fetch
4. Fetch resets state to DB value → TiptapEditor content prop changes → unsaved edits lost

Affects all 11 edit pages.

## Solution: Two Parts

### Part 1: Stabilize AuthProvider

In `components/auth-provider.tsx`, use a `useRef` to track current user ID. In `onAuthStateChange`, compare `session.user.id` with the ref — only call `setUser()` when the ID actually changes. This prevents token refreshes from triggering unnecessary re-renders.

```typescript
const userIdRef = useRef<string | null>(null);

// In onAuthStateChange:
const newUserId = session?.user?.id ?? null;
if (newUserId !== userIdRef.current) {
  userIdRef.current = newUserId;
  setUser(session?.user ?? null);
  if (newUserId) fetchProfile(newUserId);
  else setProfile(null);
}
```

### Part 2: Auto-save Hook

New file `hooks/use-auto-save.ts` — a shared hook used by all edit pages (except `privacy/edit`).

**Interface:**
```typescript
useAutoSave({
  hasChanges: boolean,
  onSave: () => Promise<void>,
  delay?: number,    // default 3000ms
  enabled?: boolean, // default true
})
```

**Behavior:**
- Debounced auto-save: triggers `onSave()` 3 seconds after last change
- `beforeunload` warning when `hasChanges` is true
- Manual save cancels pending auto-save timer

**Integration per edit page (~3 lines):**
```typescript
import { useAutoSave } from "@/hooks/use-auto-save";
useAutoSave({ hasChanges, onSave: handleSave });
```

### Not in scope

- localStorage draft caching (unnecessary given 3s debounce)
- Shared entity/save hook (pages too different, over-engineering)
- `privacy/edit` (versioning system, different save semantics)
