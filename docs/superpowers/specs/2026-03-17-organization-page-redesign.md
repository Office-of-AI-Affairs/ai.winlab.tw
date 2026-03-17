# Organization Page Redesign Spec
**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Redesign the `/organization` page for the NYCU AI Office website to display:
1. A visual org chart (SVG connectors + Tailwind nodes) matching the official AI Office structure
2. A tabbed member section with three tabs: 核心成員 | 法人 | 產業

---

## Page Structure

```
/organization
├── Title: AI 專責辦公室組織架構
├── OrgChart (static, SVG connectors + Tailwind nodes)
│   ├── Solid lines: hierarchy connections
│   └── Dashed line: horizontal line at 法人/產業 row with text label "聯盟"
│       (「聯盟」is NOT a node — it is a text label drawn on the dashed line itself)
└── Member Section
    ├── Tabs: 核心成員 | 法人 | 產業
    ├── 核心成員: 4 professors (DB-stored, category='core')
    ├── 法人: empty for now (DB-managed, admin can add)
    └── 產業: empty for now (DB-managed, admin can add)
```

---

## Org Chart Layout

The chart uses a CSS Grid with 5 columns × 3 rows inside a relative-positioned container.
An SVG element is absolutely positioned on top (inset-0, pointer-events-none).

### Grid layout (conceptual)

```
Col:   [法人]    [副主任左]  [主任]   [副主任右]  [產業]
Row1:    —          —       主任        —          —
Row2:   法人      副主任(左)   —      副主任(右)   產業
Row3:    —        合聘專家  培訓團隊  應用團隊      —
```

Precise column widths: `grid-cols-[1fr_1.5fr_1.5fr_1.5fr_1fr]`

Nodes span specific `col-start` / `row-start` positions:

| Node | col-start | row-start | colspan | Notes |
|------|-----------|-----------|---------|-------|
| 主任（曾建超） | 3 | 1 | 1 | center top |
| 副主任（黃俊龍） | 2 | 2 | 1 | |
| 副主任（陳建志） | 4 | 2 | 1 | |
| 合聘專家（許懷中） | 2 | 3 | 1 | |
| 培訓團隊 | 3 | 3 | 1 | |
| 應用團隊 | 4 | 3 | 1 | |
| 法人 | 1 | 2 | 1 | left side, purple bg |
| 產業 | 5 | 2 | 1 | right side, orange bg |

### SVG connector lines

All coordinates are percentages of the container's width/height.
Lines are drawn center-to-center between nodes.

Solid lines (hierarchy):
- 主任 → 副主任(左): vertical down then left
- 主任 → 副主任(右): vertical down then right
- 副主任(左) → 合聘専家: vertical down
- 副主任(左/右) share a horizontal connector to row 3 center
- Center row 3 → 培訓團隊 and 應用團隊

Dashed line (alliance):
- Horizontal line at row 2 mid-height spanning from 法人 node center to 產業 node center
- Two "聯盟" text labels: one near 法人 side, one near 產業 side

Implementation note: Because the grid uses unequal column widths (`1fr` vs `1.5fr`), static pre-calculated SVG coordinates would only be accurate at one container width. Instead, use `useRef` on each node div and a `ResizeObserver` on the container to measure `getBoundingClientRect()` positions at runtime, then draw `<line>` elements using those coordinates. This is the same pattern used by `Squircle` in this codebase. The SVG is `position: absolute; inset: 0; pointer-events: none; overflow: visible`.

---

## Member Cards

Each card shows (fields hidden when null):
- Photo (square aspect, object-cover; fallback: `/placeholder.png`)
- Name (large, bold)
- Role (e.g., 主任、副主任、合聘專家) — hidden if null
- 學校（最高學歷）— hidden if null
- 研究領域 — hidden if null (displayed as plain text, possibly multi-line)
- Email — shown as `mailto:` link; hidden if null
- 個人網頁 — shown as external link with icon; hidden if null

---

## DB Migration

File: `supabase/migrations/YYYYMMDDHHMMSS_update_organization_members.sql`

```sql
-- 1. Add new columns first (all nullable TEXT — no NOT NULL constraint)
ALTER TABLE organization_members
  ADD COLUMN school TEXT,
  ADD COLUMN research_areas TEXT,   -- free-text, may be multi-line
  ADD COLUMN email TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN member_role TEXT;      -- named member_role to avoid collision with profile.role
                                    -- nullable: new members created from UI insert NULL here

-- 2. Create new enum type
CREATE TYPE organization_member_category_new
  AS ENUM ('core', 'legal_entity', 'industry');

-- 3. Migrate all existing rows to 'core'
-- (existing data has ai_newcomer/industry_academy/alumni; all map to core
--  since no current data exists that maps to legal_entity or industry)
ALTER TABLE organization_members
  ALTER COLUMN category DROP DEFAULT,
  ALTER COLUMN category TYPE organization_member_category_new
    USING 'core'::organization_member_category_new;

-- 4. Drop old enum, rename new one
DROP TYPE organization_member_category;
ALTER TYPE organization_member_category_new RENAME TO organization_member_category;

-- 5. Update RLS policies if they reference category values by name
-- (check Supabase policy definitions for organization_members and re-apply if needed)
```

**Note on RLS:** Existing RLS policies on `organization_members` use role-based checks (`auth.uid()`, `profile.role = 'admin'`) not category values. No policy changes needed unless a category-specific policy exists.

---

## TypeScript Types

Update `lib/supabase/types.ts`:

```ts
export type OrganizationMemberCategory =
  | "core"
  | "legal_entity"
  | "industry";

export type OrganizationMember = {
  id: string;
  created_at: string;
  updated_at: string;
  category: OrganizationMemberCategory;
  name: string;
  summary: string | null;
  image: string | null;
  link: string | null;
  sort_order: number;
  // New fields
  school: string | null;
  research_areas: string | null;  // free-text
  email: string | null;
  website: string | null;
  member_role: string | null;     // "主任", "副主任", etc.
};
```

---

## Initial Data (4 Core Professors)

Insert via Supabase migration or dashboard after running schema migration:

| name | member_role | school | research_areas | email | website | category |
|------|-------------|--------|----------------|-------|---------|----------|
| 曾建超教授 | 主任 | 美國南美以美大學（資工博士） | 軟體定義網路/NFV、DevOps雲原生 | cctseng@cs.nycu.edu.tw | https://sites.google.com/view/cctseng | core |
| 黃俊龍教授 | 副主任 | 國立台灣大學（電機博士） | 資料分析、資料探勘、區塊鏈 | jlhuang@cs.nycu.edu.tw | http://www.cs.nycu.edu.tw/~jlhuang/ | core |
| 陳建志教授 | 副主任 | 國立陽明交通大學（資工博士） | AI/IoT、5G無線通訊、機器人 | jenjee@nycu.edu.tw | https://people.cs.nycu.edu.tw/~chencz/ | core |
| 許懷中教授 | 合聘專家 | 逢甲大學 | （未提供） | hwaijhsu@o365.fcu.edu.tw | （未提供） | core |

---

## Admin UI Changes

### `app/organization/[id]/edit/page.tsx`
Add form fields for: `school`, `research_areas` (textarea), `email`, `website`, `member_role`.
Update `hasChanges` diff logic to include all new fields.

### `app/organization/client.tsx`
- Tab labels: 核心成員 (core) | 法人 (legal_entity) | 產業 (industry)
- **「新增」button is hidden on the `core` tab** — core members are not created from the UI
- `handleCreate` inserts with `{ category, name, sort_order: 0, school: null, research_areas: null, email: null, website: null, member_role: null }`
- Member card layout updated to show new fields (hide each if null)

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `supabase/migrations/xxx_update_organization_members.sql` | Create | Schema migration |
| `lib/supabase/types.ts` | Modify | Update types |
| `app/organization/org-chart.tsx` | Create | Static org chart component |
| `app/organization/page.tsx` | Modify | Pass new fields through |
| `app/organization/client.tsx` | Modify | 3 tabs, new cards, hide 新增 on core tab |
| `app/organization/[id]/edit/page.tsx` | Modify | New form fields + hasChanges update |
| `components/home-organization.tsx` | Verify | Query uses `select("*")` with no category filter — no change needed. Uses `member.summary` for subtitle which is retained as a column. |

---

## `summary` Column Retention

The `summary` column is **retained** (not dropped). `home-organization.tsx` uses `member.summary` for the card subtitle and continues to work after the migration. The new member cards on `/organization` do not display `summary` — they display `school`, `research_areas`, `email`, `website` instead. Both old and new fields coexist on the table.

---

## Known Design Trade-offs

- **Org chart / DB coupling:** The org chart nodes (主任=曾建超, etc.) are hardcoded in the component. If the DB record for 曾建超 is edited or deleted, the org chart node still shows the original name. This is intentional — the org chart reflects the official structural diagram which changes infrequently.
- **Org chart is not responsive on small screens:** The 5-column grid with SVG overlay may not render well on mobile. A simplified stacked layout for mobile is out of scope for this iteration.

---

## Out of Scope

- Org chart driven by DB (not hardcoded)
- Pagination for member tabs
- Search/filter within tabs
- Mobile-specific org chart layout
