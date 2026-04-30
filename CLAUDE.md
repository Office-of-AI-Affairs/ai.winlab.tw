# CLAUDE.md

## Project overview

- Stack: Next.js 16 App Router, Supabase, Tailwind CSS v4, shadcn/ui
- Package manager: `bun`
- Rich text content stored as Tiptap JSON

## Setup

- `bun dev` / `bun build` / `bun start` / `bun lint`
- `bunx shadcn add <name>`
- `.env.local`：
  - Required：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - Admin API：`SUPABASE_SERVICE_ROLE_KEY`（`/api/admin/import-users` 用）
  - CDN opt-in：`NEXT_PUBLIC_CDN_BASE_URL`（見「CDN」段；未設則 `toCdnUrl` no-op）
  - Playwright E2E：`CLAUDE_AGENT_EMAIL` / `CLAUDE_AGENT_PASSWORD` / `CLAUDE_AGENT_USER_ID`（dedicated admin account）

### Verification

- `bun run check` — test + typecheck（CI `verify` job 還會額外跑 `bun run lint`）
- `bun run lint` — ESLint（CI-gated；本地可單獨跑）
- `bun run e2e` — Playwright smoke suite on prod（`.pw.ts` under `e2e/`，本地手動執行；CI 目前沒有 e2e job）
- `bun run analyze` — bundle analyzer (`ANALYZE=true next build`)
- Lighthouse baseline + methodology：`docs/perf-baseline.md`

### Schema regen

- `bun run gen:types` — regenerates `lib/supabase/database.types.ts`
  from the live project. Requires `SUPABASE_ACCESS_TOKEN` in
  `.env.local` (grab from <https://supabase.com/dashboard/account/tokens>)
- After regen, copy the file to `~/mcp.ai.winlab.tw/lib/supabase/` —
  both repos share the same Supabase project
  (`hwezfbhjcetpezfuvelf`) so types must stay byte-identical.

## Architecture

- Root layout is **cookieless** — `AuthProvider` hydrates `useAuth()`
  from the browser Supabase client on mount (see `docs/isr-pattern.md`)
- `useAuth()`: `user`, `profile`, `isAdmin`, `isVendor`, `isLoading`, `signIn`, `signOut`, `refreshProfile`
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
- vendor → 被 admin 指派為**某筆 recruitment 的 owner** 後才有權限（`competition_owners` pivot）
  - Owner = 能編輯該筆 recruitment + 查看應徵者
  - **只有 admin 能管理 owner 清單**（新增/移除）
  - 同一筆 recruitment 可有多名 owner（同企業多人共管）
- `isRecruitmentOwner()` in `lib/supabase/check-recruitment-owner.ts` — client-callable
- Admin gate：
  - ISR 客戶端：`useAuth().isAdmin`
  - Server Component edit 頁：`requireAdminServer()` in
    `lib/supabase/require-admin-server.ts` — 非 admin 自動 redirect；
    `/carousel`、`/contacts`、`/introduction/edit`、`/privacy/edit`、
    `/settings/users`、各 `[id]/edit` 都用它
  - `getViewer()` 只剩 `/settings/page.tsx` 與 `/profile/[id]/page.tsx`

## Data model (`lib/supabase/types.ts`)

- **Announcement** — Tiptap JSON，`status: draft|published`，`event_id`（null = 全域）
- **Result** — `pinned`，`event_id`（個人成果，team 子系統 2026-04-30 已下線）
- **Recruitment**（DB: `competitions`）— `event_id`，JSON: `positions`、`application_method`、`contact`；`created_by`（稽核用，權限判斷不看這個）
- **CompetitionOwner**（DB: `competition_owners`）— recruitment ↔ user 多對多 pivot，權限判斷核心；新 INSERT 時 trigger `auto_add_recruitment_owner` 把 creator 自動加進去
- **RecruitmentInterest**（DB: `recruitment_interests`）
- **EventParticipant**（DB: `event_participants`）— event-scoped 成員名單
- **ResultCoauthor**（DB: `result_coauthors`）— result 多作者關聯
- **Event** — `slug`，`status`，`pinned`，`sort_order`
- **Introduction** — 單筆，Tiptap JSON
- **OrganizationMember** — `category: core|legal_entity|industry`
- **Profile** — `role: admin|user|vendor`，profile fields、social links、**resume（object path, not URL）**
- **PublicProfile** — authenticated-reachable view of profiles plus
  `has_profile_data` boolean kept in sync by a trigger (used by the
  cookieless `/events/[slug]` fetcher)
- **ExternalResult**、**Tag / ResultTag**、**CarouselSlide**、**Contact**

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

## CDN

- `cdn.winlab.tw` 前擋 Supabase Storage 公開桶，由 `infra/cdn-worker/`
  Cloudflare Worker 代理 + edge cache，省 Supabase egress
- `toCdnUrl()` in `lib/cdn.ts` — 把 Supabase public storage URL 改寫成
  CDN domain；未設 `NEXT_PUBLIC_CDN_BASE_URL` 就是 no-op，可先 deploy
  程式再從 Vercel 切流量
- Setup 步驟：`docs/cdn-setup.md`

## Pages

**首頁** `/` — `HomeCarousel`, `HomeIntroduction`, `HomeAnnouncement`, `HomeEvents`, `HomeContacts`

**活動** `/events` → `/events/[slug]`（公告/成果/招募 tabs）→ `[slug]/edit`、`announcements/[id]`、`results/[id]`、`recruitment/[id]`

**內容** `/announcement`、`/introduction`（內含 `OrganizationMember` CRUD）、`/carousel`、`/contacts`、`/privacy`（各有 `/edit`）

**帳號** `/account`、`/profile/[id]`（vendor 可見 My Events）

**Auth flow** `/login`、`/forgot-password`、`/reset-password`（8 位 OTP，避開企業 link scanner）、`/auth/callback`

**Admin** `/settings`、`/settings/users`、`/api/admin/import-users`（server-only，需 `SUPABASE_SERVICE_ROLE_KEY`）

**Design system** `/design` — shadcn gallery + 專案 UI patterns 展示

**Legacy redirects**（`next.config.ts`）— `/organization` → `/introduction`、`/recruitment*` → `/events`、`/team/:id` → `/`

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

**元件** — `card.tsx` 純 div Server Component、`data-slot` 用於 CSS selectors、`next/image`（允許 `*.supabase.co` 與 `cdn.winlab.tw`）

## Delivery

- 每個實作主題獨立 commit，驗證通過即可
- Push 前跑 verification，整體完成後等使用者確認再 push
