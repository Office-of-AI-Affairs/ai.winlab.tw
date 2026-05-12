---
name: inline-view-edit
description: Use when migrating a content page on ai.winlab.tw to share view and edit on the same route (no separate /edit subroute), or when an admin chrome (toolbar) is breaking visual parity with the public view. Triggers on "inline edit", "inline view+edit", "view edit same route", "RichTextSurface", "useEditMode", "EditModeToggle", "EditActionsPill", "flush prop", "TiptapEditor flush", "edit pill", "remove /edit route", "merge view and edit", "?mode=edit".
---

# Inline view+edit pattern

The site's design philosophy: admin and visitor see the same layout on the same URL. Edit affordances appear as floating additions, never as toolbars that push content down or panels that frame the canvas. `/privacy` is the canonical example. When you're tempted to add admin chrome that visitors don't see, find a way to put it in a pill or dialog instead.

## When this skill applies

- Migrating an existing dedicated `/edit` route into the read route (`/announcement/[id]/edit` → `/announcement/[id]?mode=edit`).
- Adding a new content page where admins should edit in place.
- Reviewing a PR that's about to add a sticky top toolbar in edit mode (it shouldn't).

## The five primitives

1. **`useEditMode({ enabled })`** (`hooks/use-edit-mode.ts`) — drives `?mode=view|edit` URL state via nuqs, ⌘E toggle, auto-clears the param when the viewer can't edit. Pass `enabled: isAdmin` (or `isAuthor` etc.).

2. **`<RichTextSurface>`** (`components/rich-text-surface.tsx`) — pure presentational shell. View mode renders server HTML via `dangerouslySetInnerHTML`; edit mode dynamically loads `<TiptapEditor flush>`. Visitors never download Tiptap; admins do, only when `isEditing` flips true.

3. **`<TiptapEditor flush>`** (`components/tiptap-editor.tsx`) — `flush={true}` drops the editor's internal `min-h-[360px] py-6 sm:py-8` padding and the rounded canvas frame. Use for inline view+edit pages so the editing surface is pixel-aligned with the read layout. Default `flush={false}` keeps the padded canvas that dedicated `/edit` pages depend on.

4. **`<EditModeToggle>`** (`components/edit-mode-toggle.tsx`) — view-mode floating "編輯" pill, bottom-right. Click → `setMode("edit")`. Renders only when `isAdmin && !isEditing`.

5. **`<EditActionsPill>`** (`components/edit-actions-pill.tsx`) — edit-mode status pill that opens a Dialog. Pill shows status (`已儲存` / `尚未發布` / `儲存中…` / `第 N 版`); click opens dialog with page-specific actions, hidden attributes, and history. Body is fully controlled by the caller.

## Layout rules

- View and edit must be **byte-identical** in layout. h1, metadata, body width, share button position — all unchanged when `isEditing` flips.
- Floating action surfaces all share the same baseline: `bottom-4 right-4` mobile, `bottom-6 right-6` md+, `h-10`, `rounded-full`. Mobile toolbar sits on the same baseline at `bottom-4 left-4`.
- Status copy in the edit pill is page-specific (`第 3 版` vs `已儲存`).
- Admin chrome that doesn't fit in a pill goes into the `EditActionsPill` dialog body, not a top bar.

## Reference implementation: `/privacy`

```
app/privacy/
├── page.tsx       # server, fetches via data.ts, server-renders HTML
├── data.ts        # unstable_cache + createPublicClient (cookieless)
├── actions.ts     # revalidatePrivacy() server action
├── client.tsx     # admin layer + edit pill + version dialog
├── layout.tsx     # metadata only
└── loading.tsx    # required for nuqs useQueryState's Suspense boundary
```

`page.tsx` does NOT branch on auth. It renders the public payload. The client component reads `useAuth().isAdmin` and `useEditMode()`; non-admins see a static page, admins see the page + an edit pill.

```tsx
// client.tsx
const { isAdmin } = useAuth();
const { isEditing, setMode } = useEditMode({ enabled: isAdmin });

return (
  <div className="max-w-6xl mx-auto px-4 py-12">
    <h1>...</h1>
    <RichTextSurface
      content={content}
      contentHtml={renderedHtml}   // server-rendered HTML
      editing={isEditing}
      onChange={setContent}
    />
    {isAdmin && !isEditing && <EditModeToggle onClick={() => setMode("edit")} />}
    {isEditing && (
      <EditActionsPill status={status} statusLabel={statusLabel} title="管理隱私權政策">
        {/* page-specific dialog body: note input, publish button, history table */}
      </EditActionsPill>
    )}
  </div>
);
```

After publish, regenerate HTML on the client via `await import("@/lib/ui/rich-text").then(m => m.renderArticle(content))` so the view-mode render reflects the new version without `router.refresh()` racing with admin's typed state.

## When NOT to use this pattern

- Multi-section structural editor pages (`/events/[slug]/edit`) where a toggle reveals reorder grips, "add member", delete buttons. A "manage mode" toggle here might still need a top bar — the canvas content stays identical but new structural affordances appear.
- Admin-only routes with no visitor view (`/settings/users`, `/carousel`, `/contacts`). They can keep the dedicated edit layout.
- Forms that genuinely have no read view (user create, CSV import). Dialog/drawer is right there.

## Pitfalls

- **Bundle leak**: `import { renderArticle } from "@/lib/ui/rich-text"` at top of client.tsx pulls Tiptap-html (lowlight + extensions, ~150 KB) into the visitor bundle. Use dynamic `await import(...)` only inside the publish handler.
- **Class name leak**: `richTextDocumentClassName` is in `lib/ui/rich-text-classes.ts`, NOT `lib/ui/rich-text.ts`. The split exists for this exact reason — view surfaces import classes only, not the renderer.
- **`useSearchParams` Suspense bailout**: nuqs's `useQueryState` uses `useSearchParams`. Static prerender requires a `<Suspense>` boundary. The convention is to add a route-level `loading.tsx` (gives implicit Suspense). Without it, `bun run build` fails with `useSearchParams() should be wrapped in a suspense boundary at page "/<route>"`.
- **`router.refresh()` after autosave**: re-fetches server props, which trip the prop→state useEffect and nuke whatever admin is currently typing. Either skip the refresh (rely on local state) or guard the prop-sync effect against in-flight typing.

## Migration checklist (turning a `/edit` route into inline)

1. Add `data.ts` and `actions.ts` for the read route if missing.
2. Add `loading.tsx` (any route using `useEditMode` needs the Suspense boundary).
3. Refactor read-route `client.tsx`: add `useAuth()` + `useEditMode()` + `RichTextSurface` + `EditModeToggle` + `EditActionsPill`.
4. Move dedicated edit-page logic (publish, history, hidden attrs) into the `EditActionsPill` dialog body.
5. Delete the `/edit` directory.
6. Add 301 redirect in `next.config.ts`: `/<route>/edit` → `/<route>?mode=edit`.
7. Update settings menu / link references.
8. Update `lib/app/server-admin-pages.test.ts` — remove from admin-edit list, add to cached-public-pages list.
9. `bun run check` + `bun run build`. Confirm the route stays `○ Static`.

## Floating-surface design system

See `DESIGN.md` "Floating surfaces" section. Two families:

- **Action capsule** (`rounded-full`): single-row floating tools — BubbleMenu, FloatingMenu block menu, mobile toolbar (closed), EditModeToggle, EditActionsPill.
- **Panel** (`rounded-2xl`): multi-row containers — slash dropdown, mobile toolbar (insert open), Dialogs / Popovers.

All share `border bg-background/95 shadow-lg backdrop-blur-sm`. Bottom-anchored ones share `bottom-4 md:bottom-6` baseline.

## Related skills

- `isr-page` — the four-piece pattern that makes the read route static
- `rls-permissions` — admin SELECT must align with what `useAuth().isAdmin` gates client-side
