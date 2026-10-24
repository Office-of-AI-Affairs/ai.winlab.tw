# CLAUDE.md

## Project overview

- Stack: Next.js 16 App Router, Postgres 18 + Drizzle, Better Auth, Tailwind CSS v4, shadcn/ui
- Self-hosted on the Carrel machine `ai` (tenant winfra); Postgres runs next to it (`infra/postgres/compose.yaml`)
- Package manager: `bun`
- Rich text content stored as Tiptap JSON

## Setup

- `bun dev` / `bun build` / `bun start` / `bun lint`
- `bunx shadcn add <name>`
- `.env.local`：
  - Required：`DATABASE_URL`、`BETTER_AUTH_URL`（public origin，例如 `https://ai.winlab.tw`）、`BETTER_AUTH_SECRET`
  - Mail（忘記密碼驗證碼）：`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASSWORD`、`MAIL_FROM`；dev 用 `MAIL_REDIRECT_TO` 把所有信改寄給自己
  - MCP revalidate：`WEB_BASE_URL`（machine 上設 `http://127.0.0.1:3000`）、`REVALIDATE_SECRET`
  - Analytics kill switch：`NEXT_PUBLIC_ANALYTICS_DISABLED=1` 關閉 `<AnalyticsBeacon />`（見「Analytics」段）
  - Playwright E2E：`CLAUDE_AGENT_EMAIL` / `CLAUDE_AGENT_PASSWORD` / `CLAUDE_AGENT_USER_ID`（dedicated admin account）
  - Cron：`CRON_SECRET`（gate `/api/cron/publish-scheduled`，未設時該 route 回
    500，不會誤放行）。**目前沒有任何排程器在打它** — 見「Editorial workflow」段

### Verification

- `bun run check` — test + typecheck（CI `verify` job 還會額外跑 `bun run lint`）
- `bun run lint` — ESLint（CI-gated；本地可單獨跑）
- `bun run e2e` — Playwright smoke suite on prod（`.pw.ts` under `e2e/`，本地手動執行；CI 目前沒有 e2e job）
- `bun run analyze` — bundle analyzer (`ANALYZE=true next build`)
- Lighthouse baseline + methodology: `perf-audit` skill (`.claude/skills/perf-audit/`)

### Schema

- Migrations are hand-written SQL in `drizzle/` with `drizzle/meta/_journal.json`;
  the app applies them on boot (`instrumentation.ts` → `lib/db/migrate.ts`).
  A new migration = a new numbered file + a journal entry with a larger `when`.
- `lib/db/schema.ts` mirrors the SQL for typed queries (column names as keys,
  timestamptz as ISO strings). `packages/db` keeps the row types the
  components use (`@winlab/db`); keep both in step with the SQL.
- `0001_baseline.sql` is the Supabase schema as of 2026-10-24 without RLS;
  `scripts/import-supabase.ts` copied the data over at the cutover.

## Architecture

- Root layout is **cookieless** — `AuthProvider` hydrates `useAuth()`
  from `GET /api/me` on mount (see `isr-page` skill)
- `useAuth()`: `user`, `profile`, `isAdmin`, `isVendor`, `isLoading`, `signIn`, `signOut`, `refreshProfile`
- `NuqsAdapter` in root layout for URL search param state
- Root layout fetches pinned events through the cached `getPinnedEvents()`
  helper (no cookies) so every downstream page can still ISR
- MCP lives in this app at `/mcp` (`lib/mcp/`). Better Auth is the OAuth
  server; tools run as the token's user (`runAsViewer`) through the same
  server actions and permission rules as the site. Shared composers in
  `packages/domain`.

## Components

`components/` is organized by domain, one folder per feature area, plus
two cross-cutting layers (`ui/`, `shared/`):

| Folder | Holds |
|---|---|
| `ui/` | shadcn primitives only — regenerable via `bunx shadcn add <name>`, see `docs/design/visual-identity.md#component-policy` |
| `home/` | `/` sections (`HomeCarousel`, `HomeStats`, `HomePartners`, `HomeAnnouncement`, ...) and the carousel client/indicators they render |
| `announcement/` | `/announcement` list + article client |
| `insights/` | `/insights` card |
| `events/` | `/events/[slug]` tabs — results, recruitment, members, coauthors, vendor section |
| `admin/` | `/settings/users` table + dialogs, settings menu |
| `introduction/` | `/introduction` organization member dialog |
| `layout/` | root-layout chrome: header, footer, language switch, auth provider, analytics beacon, lazy toaster |
| `editor/` | the Tiptap editor stack + the inline view/edit primitives (`RichTextSurface`, `EditModeToggle`, `EditActionsPill`) that every article-style page shares |
| `seo/` | JSON-LD structured-data builders |
| `shared/` | generic cross-domain primitives that aren't shadcn output: `AppLink`, `Block`, `SubButton`, `PageShell`/`PageSection`, `Reveal`, `FloatingActionPill`, `ShareButtons`, `Toc` |

No feature component sits directly in `components/` — everything below
`ui/` belongs to exactly one of the folders above. When adding a new
component, put it in the domain it serves; if it's genuinely used across
domains and isn't shadcn output, it goes in `shared/`.

## ISR / SSG pattern

Public-facing pages (`/`, `/introduction`, `/announcement`, `/events`,
`/privacy`, plus detail pages) use a four-piece pattern: `page.tsx`
(server, cookieless, rendered per request because the CI build has no
database) + `data.ts` (`unstable_cache` + Drizzle) + `actions.ts` (Server
Actions that `updateTag`) + `client.tsx` (admin UI + draft merge via
`useAuth`). Full playbook, cache-tag inventory, and add-a-new-page
checklist live in the `isr-page` skill.

## Auth

Postgres has no RLS: every permission rule lives in server code.

| 情境 | 用什麼 |
|------|----------|
| Client Component | `useAuth()`；寫入呼叫 server actions（`lib/actions/*`） |
| Server Component / Route Handler | `getViewer()` / `requireViewer()` / `requireAdmin()` in `lib/auth/viewer.ts` |
| Server action | `actor(...roles)`（throws Forbidden），或 `lib/actions/rows.ts` 的 generic row actions |
| 表格權限 | `lib/permissions/rows.ts`（正式站 RLS 2026-10-24 逐條翻譯；update 前後都檢查） |
| Cookieless public read (data.ts) | Drizzle + `liveAnnouncement()` 等 filter（`lib/db/filters.ts`） |

- 未登入 → 只看 `status: published` 且已到 `publish_at`（announcements 限定，見
  「Editorial workflow」段）
- 登入非 admin/editor → 自己的草稿 + 所有已上線 published
- admin → 完整讀寫（`profile.role === 'admin'`）
- editor → `profile.role === 'editor'`；能建立/編輯 announcements + results 的
  **draft**，不能設 `status: 'published'`、不能改已 published 的 row（row
  actions 在同一交易鎖列後檢查前後狀態，不只是 UI 隱藏），無 users/carousel/contacts/introduction
  管理權；`useAuth().isEditor`
- vendor → 被 admin 指派為**某筆 recruitment 的 owner** 後才有權限（`competition_owners` pivot）
  - Owner = 能編輯該筆 recruitment + 查看應徵者
  - **只有 admin 能管理 owner 清單**（新增/移除）
  - 同一筆 recruitment 可有多名 owner（同企業多人共管）
- `isRecruitmentOwner()` in `lib/data/recruitment.ts` — server only
- Admin gate：
  - ISR 客戶端：`useAuth().isAdmin`
  - Server Component edit 頁：`requireAdmin()` in
    `lib/auth/viewer.ts` — 非 admin 自動 redirect；
    `/carousel`、`/contacts`、`/introduction/edit`、
    `/settings/users`、各 `[id]/edit` 都用它
  - Inline view+edit 共用同一條路由（`?mode=edit` 透過
    `useEditMode` 切換）：`/privacy` 已採此 pattern，由 `useAuth().isAdmin`
    + `RichTextSurface` 在客戶端動態載入 Tiptap，不污染訪客 bundle

## Data model (`packages/db/src/types.ts`, `lib/db/app-schema.ts`)

- **Announcement** — Tiptap JSON，`status: draft|published`，`event_id`（null = 全域），
  `publish_at`（選填 timestamptz，排程發布，見「Editorial workflow」段）
- **Result** — `pinned`，`event_id`（個人成果，team 子系統 2026-04-30 已下線）
- **ContentRevision**（DB: `content_revisions`）— announcements/results 的
  editorial 欄位快照，AFTER UPDATE trigger 寫入，restore = 一次新的 UPDATE
- **AuditLogEntry**（DB: `audit_log`）— announcements/results/events/
  carousel_slides/organization_members 的 insert/update/delete 記錄，
  admin-only 讀取
- **Recruitment**（DB: `competitions`）— `event_id`，JSON: `positions`、`application_method`、`contact`；`created_by`（稽核用，權限判斷不看這個）
- **CompetitionOwner**（DB: `competition_owners`）— recruitment ↔ user 多對多 pivot，權限判斷核心；新 INSERT 時 trigger `auto_add_recruitment_owner` 把 creator 自動加進去
- **RecruitmentInterest**（DB: `recruitment_interests`）
- **EventParticipant**（DB: `event_participants`）— event-scoped 成員名單
- **ResultCoauthor**（DB: `result_coauthors`）— result 多作者關聯
- **Event** — `slug`，`status`，`pinned`，`sort_order`
- **Introduction** — 單筆，Tiptap JSON
- **OrganizationMember** — `category: core|legal_entity|industry`
- **Profile** — `role: admin|user|vendor|member|editor`，profile fields、social links、**resume（object path, not URL）**
- **PublicProfile** — authenticated-reachable view of profiles plus
  `has_profile_data` boolean kept in sync by a trigger (used by the
  cookieless `/events/[slug]` fetcher)
- **ExternalResult**、**Tag / ResultTag**、**CarouselSlide**、**Contact**

Conventions:
- `event_id IS NULL` → 全域（僅 Announcement）
- Recruitment 一律 event-scoped，無全域招募頁
- Results 無全域列表，詳情在 `/events/[slug]/results/[id]`

## Database & storage

- Migrations: `drizzle/`（見「Schema」段），開機時自動套用
- Files live in Postgres (`files` table, `bytea`), two buckets:
  - `announcement-images` (public) — served by `app/files/[bucket]/[...path]`
    at `/files/announcement-images/<path>`; rows and Tiptap JSON store that
    path. Uploads: `POST /api/files` (`lib/files/upload.ts`: type by magic
    bytes, no SVG, folder rules from the old storage policy)
  - `resumes` (private) — `<userId>/...`; any signed-in user downloads via
    `app/[locale]/profile/[id]/resume/route.ts`; MCP gets HMAC-signed links
    (`lib/files/signed.ts`)
- `/files/*` has its own CSP (`sandbox`) in `next.config.ts`
- Backups: `infra/postgres/backup.sh`（pg_dump，見檔內說明）

## Editorial workflow (#47)

- **Scheduled publishing** — `announcements.publish_at` (nullable
  timestamptz). A row is "live" for anon/authenticated non-privileged reads
  when `status = 'published' and (publish_at is null or publish_at <= now())`
  — enforced by `liveAnnouncement()` in `lib/db/filters.ts`, used by every
  public `data.ts`/feed/sitemap read, and by the announcements read rule in
  `lib/permissions/rows.ts` (MCP goes through the same rule). `results` and
  `events` deliberately don't get this column — no scheduling need there yet.
  - Cache freshness: `GET /api/cron/publish-scheduled` (`CRON_SECRET`-gated)
    finds announcements whose `publish_at` passed in the last 10 minutes and
    invalidates the `announcements-published` ISR tag. Without it a scheduled
    post can sit invisible on the cached list/home page for up to the 1h
    `revalidate` window even though the filter already lets it through.
    `/events/[slug]` never needed this — that route is already `ƒ Dynamic`
    (see the `isr-page` skill), so scheduling reflects there immediately.
  - **No scheduler currently calls that route.** It was a Vercel Cron when
    the site ran on Vercel
    (`apps/web/vercel.json`, `*/5 * * * *`), but that cadence exceeds the
    Hobby plan's once-per-day limit and failed *every* production deployment
    from #77 (2026-08-24) until #78 (2026-09-06) — the site could not deploy
    at all for two weeks. No announcement uses `publish_at` yet, so the
    schedule was invalidating nothing while blocking every deploy; `vercel.json`
    was deleted rather than downgraded to daily. Scheduled publishing still
    works (the filter is the boundary); the only cost is cached pages lagging go-live
    by up to 1h. To restore sub-hour freshness, call the route from a
    scheduler (for example a systemd timer on the Carrel machine) with the
    `CRON_SECRET` bearer token.
- **Version history** — `content_revisions` (table_name, row_id, snapshot
  jsonb, changed_by, created_at). An `AFTER UPDATE` trigger on
  `announcements` + `results` snapshots the OLD row's editorial fields
  before every real change. Admin/editor-only read (`listRevisions`). The
  announcement editor's History panel lists revisions + a one-click
  "restore" (an UPDATE — which itself creates a new revision, so a restore
  can always be undone). No diff view by design.
- **Audit log** — `audit_log` (table_name, row_id, action, actor,
  changed_fields, created_at), populated by a generic `AFTER INSERT OR
  UPDATE OR DELETE` trigger on `announcements`, `results`, `events`,
  `carousel_slides`, `organization_members`. Admin-only read
  (`requireAdmin()`) at `/settings/audit`. Every row comes from the
  triggers; the actor is `app_user_id()`, which writes set through
  `asUser(userId, ...)` in `lib/db/index.ts`.
- **`editor` role** — new `profiles.role` value. Can create/edit *draft*
  announcements + results; the row actions refuse setting
  `status = 'published'` and touching a row that's already published —
  checked on the server, not just a hidden button, so it also applies to
  MCP tools. No access to users/carousel/contacts/
  introduction management. `useAuth().isEditor`.

## Pages

**首頁** `/` — `HomeCarousel`, `HomeIntroduction`, `HomeAnnouncement`, `HomeEvents`, `HomeContacts`

**活動** `/events` → `/events/[slug]`（公告/成果/招募 tabs）→ `[slug]/edit`、`announcements/[id]`、`results/[id]`、`recruitment/[id]`

**內容** `/announcement`、`/carousel`、`/contacts`（各有 `/edit`）；inline view+edit（`?mode=edit` 切換）：`/privacy`、`/introduction`（後者額外掛 `OrganizationMember` CRUD）

**帳號** `/account`、`/profile/[id]`（vendor 可見 My Events）

**Auth flow** `/login`、`/forgot-password`（8 位驗證碼，避開企業 link scanner）；`/reset-password` 與 `/auth/callback` 只把舊信件連結導到 `/forgot-password`；MCP 授權同意頁 `/oauth/consent`

**Admin** `/settings`、`/settings/users`、`/settings/audit`（admin-only 稽核紀錄，見「Editorial workflow」段）（使用者 CRUD 與 CSV 匯入：`lib/actions/users.ts`）

**Design system** `/design` — shadcn gallery + 專案 UI patterns 展示

**Legacy redirects**（`next.config.ts`）— `/organization` → `/introduction`、`/recruitment*` → `/events`、`/team/:id` → `/`、`/privacy/edit` → `/privacy?mode=edit`、`/introduction/edit` → `/introduction?mode=edit`

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
- 寫入一律呼叫 server actions；hooks 不直接碰資料庫
- Callback props（`uploadFn`, `onBeforeSave` 等）用 `useRef` 穩定（同 `useAutoSave` 的 `onSaveRef` 模式）
- All CRUD operations must show `toast.error` on failure
- Edit pages 接收 server-passed `initialData`（page.tsx fetch → client props），不做 client-side fetch
- Wire mutations to cache tags via the `onAfter*` callbacks; see
  the `isr-page` skill for the tag inventory

## Editor

- `TiptapEditor`（`components/editor/tiptap-editor.tsx`）— 圖片上傳用 `uploadAnnouncementImage`
- `nuqs` — URL params（`NuqsAdapter` in root layout）

## Design system

**Single source of truth**: [`DESIGN.md`](DESIGN.md) at the repo root —
canonical spec (Google's DESIGN.md format: YAML frontmatter + canonical
sections). Live gallery at `/design` renders one specimen of every
primitive listed there. Token rationale (color/radius/typography/
spacing/imagery — why, not just what) lives in
[`docs/design/visual-identity.md`](docs/design/visual-identity.md);
`DESIGN.md` cites it rather than duplicating values.

Quick reminders that bite during implementation (full rationale in
`DESIGN.md` and `docs/design/visual-identity.md`):

- **Tokens** — semantic only (`text-foreground`, `bg-primary`, `border-border`).
  Never hardcode `gray-*` or hex literals. `--primary` is OKLCH (brand blue,
  with a same-hue dark-mode variant); there is no `--nycu` token or
  `.bg-nycu`/`.text-nycu` utility — use `bg-primary`/`text-primary`.
- **Radius** — base `--radius: 1rem`; `rounded-sm` 0.5rem, `rounded-md`
  0.75rem (controls), `rounded-lg` 1rem (cards/dialogs), `rounded-xl`
  1.5rem (hero surfaces), `rounded-2xl` 2rem (floating panels),
  `rounded-full` for capsule. Don't hardcode `rounded-[...]` literals.
- **Interaction** — `duration-200` only; `hover:scale-[1.02]` +
  `active:scale-[0.98]` or `.interactive-scale`. **Never `transition-all`**
  (banned by `lib/ui/patterns.test.ts`).
- **Layout** — `<PageShell tone="...">` / `<PageSection tone="...">` from
  `lib/ui/patterns.ts`. Six shell tones: `content` / `dashboard` / `admin`
  / `editor` / `auth` / `profile`.
- **Floating tools** — two families on the same glass treatment
  (`border bg-background/95 shadow-lg backdrop-blur-sm`). Capsule
  (`rounded-full`, `h-10`) for single-row action surfaces; panel
  (`rounded-2xl`) for multi-row. Bottom-anchored ones sit at
  `bottom-4 md:bottom-6` so they share the same baseline.
- **Inline view+edit pages** — server HTML in view, `RichTextSurface`
  swaps in `TiptapEditor flush` for admin, floating pill + dialog for
  actions (`/privacy` is the canonical example).
- **Editor** — desktop uses `BubbleMenu` + `FloatingMenu` (incl.
  `/`-trigger), mobile uses `TiptapMobileToolbar`. Don't ship a persistent
  full toolbar.
- **Status** — `<Badge>` always: `default` = 已發布, `secondary` = 草稿.
- **Empty state** — `尚無{entity}` centered, `text-muted-foreground`.
- **Links** — `<AppLink>`, never raw `<a>`.
- **Skeletons** — high-level components own their matching skeleton;
  route-level `loading.tsx` composes from those, doesn't draft from raw
  `<Skeleton>`.

**Stack notes**: shadcn/ui in `components/ui/`, Tailwind v4 in
`app/globals.css` (no `tailwind.config.js`), `next-themes` defaultTheme
`light`. `card.tsx` stays a plain `<div>` Server Component; `data-slot`
is the standard selector hook; `next/image` serves `/files/...` locally
and allows `ai.winlab.tw/files/announcement-images/**` for absolute URLs.

## Analytics

- First-party, cookieless pageview + web-vitals beacon for public pages
  (client-side vitals and navigations that server spans don't capture —
  see `instrumentation.ts`)
- `<AnalyticsBeacon />` (`components/layout/analytics-beacon.tsx`) mounted once
  in the root layout: pageview on load + every App Router navigation
  (`usePathname` effect), web-vitals via `useReportWebVitals`
  (`next/web-vitals`); `navigator.sendBeacon` first, `fetch(...,
  { keepalive: true })` fallback
- `POST /api/beacon` (`app/api/beacon/route.ts`, `runtime: "nodejs"` so
  it shares the instrumentation-registered logger) validates the payload
  (`lib/analytics/schema.ts` — pure, unit-tested, whitelist-only) and
  emits it as an OTel log record via `emitAnalyticsLog`
  (`lib/otel/log.ts`), the sibling of `emitErrorLog`. Always `204`, never
  errors to the client
- No cookies, no user id, no raw IP, no full referrer URL — only
  path/referrer-origin/utm/locale/viewport client-side plus
  country/region (Vercel geo headers) and a coarse UA-derived device
  bucket server-side
- Never fires on `/settings`, `/login`, or `?mode=edit`
  (`isExcludedPath`, locale-prefix aware) — visitor analytics only
- `NEXT_PUBLIC_ANALYTICS_DISABLED=1` disables the beacon entirely

## Delivery

- 每個實作主題獨立 commit，驗證通過即可
- Push 前跑 verification，整體完成後等使用者確認再 push
