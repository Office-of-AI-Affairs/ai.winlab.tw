# CLAUDE.md

## Project overview

- Stack: Next.js 16 App Router, Supabase, Tailwind CSS v4, shadcn/ui
- Package manager: `bun`
- Rich text content stored as Tiptap JSON

## Setup

- `bun dev` / `bun build` / `bun start` / `bun lint`
- `bunx shadcn add <name>`
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

## Architecture

- Root layout is **cookieless** — `AuthProvider` hydrates `useAuth()`
  from the browser Supabase client on mount (see `docs/isr-pattern.md`)
- `useAuth()`: `user`, `profile`, `isAdmin`, `isLoading`, `signIn`, `signOut`
- `NuqsAdapter` in root layout for URL search param state
- Root layout fetches pinned events through the cached `getPinnedEvents()`
  helper (no cookies) so every downstream page can still ISR
- Sibling MCP repo: `~/mcp.ai.winlab.tw`，變更 schema / RLS / admin workflow 後需同步

## ISR / SSG pattern

Public-facing pages (`/`, `/introduction`, `/announcement`, `/events`,
`/privacy`, plus detail pages) render statically via a four-piece
pattern: `page.tsx` (server, cookieless) + `data.ts`
(`unstable_cache` + `createPublicClient`) + `actions.ts` (Server
Actions that `updateTag`) + `client.tsx` (admin UI + draft merge via
`useAuth`). See `docs/isr-pattern.md` for the full playbook, tag
inventory, and how to add a new page.

## Auth

| 情境 | 匯入路徑 |
|------|----------|
| Client Component | `@/lib/supabase/client` |
| Server Component / Route Handler | `@/lib/supabase/server` |
| Cookieless public read (ISR data.ts) | `@/lib/supabase/public` |

- 未登入 → 只看 `status: published`
- 登入非 admin → 自己的草稿 + 所有 published
- admin → 完整讀寫（`profile.role === 'admin'`）
- vendor → 被指派活動下的招募 CRUD（`event_vendors` + `created_by = auth.uid()`）
- `isEventVendor()` in `lib/supabase/check-event-vendor.ts` — client-callable
- Admin / role checks happen on the client via `useAuth()` for pages on
  the ISR pattern; legacy server pages (`/settings/*`) still use
  `getViewer()`

## Data model (`lib/supabase/types.ts`)

- **Announcement** — Tiptap JSON，`status: draft|published`，`event_id`（null = 全域）
- **Result** — `type: personal|team`，`pinned`，`event_id`
- **Recruitment**（DB: `competitions`）— `event_id`，JSON: `positions`、`application_method`、`contact`；`created_by`
- **EventVendor**（DB: `event_vendors`）— vendor ↔ event
- **RecruitmentInterest**（DB: `recruitment_interests`）
- **Event** — `slug`，`status`，`pinned`，`sort_order`
- **Introduction** — 單筆，Tiptap JSON
- **OrganizationMember** — `category: core|legal_entity|industry`
- **Profile** — `role: admin|user|vendor`，profile fields、social links、**resume（object path, not URL）**
- **PublicProfile** — authenticated-reachable view of profiles plus
  `has_profile_data` boolean kept in sync by a trigger (used by the
  cookieless `/events/[slug]` fetcher)
- **ExternalResult**、**Tag / ResultTag**、**Team**、**CarouselSlide**、**Contact**

Conventions:
- `event_id IS NULL` → 全域（僅 Announcement）
- Recruitment 一律 event-scoped，無全域招募頁
- Results 無全域列表，詳情在 `/events/[slug]/results/[id]`

## Database & storage

- Migrations: `supabase/migrations/`，依序在 SQL Editor 執行，所有表 RLS
- Buckets — see `docs/storage-buckets.md` for the full layout, RLS, and
  maintenance scripts:
  - `announcement-images` (public) — visitor-facing images, WebP-first
  - `resumes` (private) — per-user folders, session-gated download via
    `app/profile/[id]/resume/route.ts`
- Maintenance scripts in `scripts/` (gitignored, force-added):
  - `recompress-images.ts` — direct-column URLs
  - `recompress-tiptap-images.ts` — jsonb Tiptap embeds
  - `cleanup-orphans.ts` — DB-unreferenced storage objects

## Pages

**首頁** `/` — `HomeCarousel`, `HomeIntroduction`, `HomeAnnouncement`, `HomeEvents`, `HomeContacts`

**活動** `/events` → `/events/[slug]`（公告/成果/招募 tabs）→ `[slug]/edit`、`announcements/[id]`、`results/[id]`、`recruitment/[id]`

**內容** `/announcement`、`/introduction`、`/organization`、`/carousel`、`/contacts`、`/privacy`（各有 `/edit`）

**帳號** `/account`、`/profile/[id]`（vendor 可見 My Events）

**Admin** `/settings`、`/settings/users`

## Hooks

Hooks own state + logic，components 只負責 UI render。

- `useAutoSave` — debounce save + navigation guard
- `useContentEditor` — generic editor CRUD；accepts `onAfterSave`,
  `onAfterPublish`, `onAfterRemove` callbacks for cache invalidation
- `useImageUpload` — single image upload with file ref + loading state
- `useCrudList` — admin list CRUD + reorder；accepts `onAfterMutation`
- `useDialogForm` — dialog-driven CRUD；accepts `onAfterSave`, `onAfterRemove`
- `useProfileEditor` — profile field save, links, external results CRUD
- `useEventActions` — event detail: create content, toggle pins

Conventions:
- All hooks 用 `useRef(createClient())` 穩定 Supabase reference
- Callback props（`uploadFn`, `onBeforeSave` 等）用 `useRef` 穩定（同 `useAutoSave` 的 `onSaveRef` 模式）
- All CRUD operations must show `toast.error` on failure
- Edit pages 接收 server-passed `initialData`（page.tsx fetch → client props），不做 client-side fetch
- Wire mutations to cache tags via the `onAfter*` callbacks; see
  `docs/isr-pattern.md` for the tag inventory

## Editor

- `TiptapEditor`（`components/tiptap-editor.tsx`）— 圖片上傳用 `uploadAnnouncementImage`
- `nuqs` — URL params（`NuqsAdapter` in root layout）

## UI rules

**圓角** — `rounded-sm/md` = 1rem（內部）、`rounded-lg+` = 2rem（外層）、`--radius: 2rem`

**互動** — `duration-200` only、`hover:scale-[1.02]` + `active:scale-[0.98]` 或 `.interactive-scale`

**間距** — 首頁 `py-16`、內容 `py-12`、admin `py-8`；用 `PageSection` / `PageShell` variants

**連結** — 統一用 `AppLink`，不用 raw `<a>`

**Skeleton** — High-level UI components should own their matching skeleton components；Route-level loading files should compose layout with component-owned skeletons

**Editor** — Desktop Tiptap editing should use contextual controls instead of a persistent full toolbar；`BubbleMenu`（inline）+ `FloatingMenu`（block，含 `/`-triggered insertion）；Mobile Tiptap editing should use a dedicated compact toolbar instead of desktop-style floating controls

**Status** — 統一用 `Badge` component（`variant="default"` = 已發布，`variant="secondary"` = 草稿）

**Empty state** — 統一用 `尚無{entity}` 格式，centered text with `text-muted-foreground`

**Color** — 用 semantic tokens（`text-foreground`、`bg-background` 等），不硬編碼 `gray-*`

**套件** — shadcn/ui in `components/ui/`、Tailwind v4 in `app/globals.css`（無 `tailwind.config.js`）、`next-themes` defaultTheme="light"

**字型** — `--font-noto-sans`（UI）、`--font-noto-sans-mono`（code）、`--font-instrument-serif`（裝飾，需 inline style）

**元件** — `card.tsx` 純 div Server Component、`data-slot` 用於 CSS selectors、`next/image`（允許 `*.supabase.co`）

## Delivery

- 每個實作主題獨立 commit，驗證通過即可
- Push 前跑 verification，整體完成後等使用者確認再 push
