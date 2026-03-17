# Organization Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/organization` to show a static SVG org chart + tabbed member cards (核心成員 | 法人 | 產業) with rich professor profiles.

**Architecture:** DB schema is extended with 5 new columns and the category enum is replaced. A new static `OrgChart` client component draws SVG connector lines using `useRef` + `ResizeObserver` to measure node positions at runtime. The member section becomes a 3-tab grid of detailed cards.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL), Tailwind CSS v4, shadcn/ui, TypeScript, bun

**Spec:** `docs/superpowers/specs/2026-03-17-organization-page-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260317000001_update_organization_members.sql` | Create | DB schema changes |
| `lib/supabase/types.ts` | Modify | Update TS types |
| `app/organization/org-chart.tsx` | Create | Static org chart component |
| `app/organization/client.tsx` | Modify | 3 tabs, new member card UI |
| `app/organization/page.tsx` | Modify | Pass new fields through |
| `app/organization/[id]/edit/page.tsx` | Modify | New form fields + hasChanges fix |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260317000001_update_organization_members.sql`

- [ ] **Step 1.1: Create migration file**

```sql
-- supabase/migrations/20260317000001_update_organization_members.sql

-- 1. Add new columns (all nullable TEXT)
ALTER TABLE organization_members
  ADD COLUMN school TEXT,
  ADD COLUMN research_areas TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN member_role TEXT;

-- 2. Create new enum type
CREATE TYPE organization_member_category_new
  AS ENUM ('core', 'legal_entity', 'industry');

-- 3. Migrate all existing rows to 'core'
ALTER TABLE organization_members
  ALTER COLUMN category DROP DEFAULT,
  ALTER COLUMN category TYPE organization_member_category_new
    USING 'core'::organization_member_category_new;

-- 4. Swap enum type
DROP TYPE organization_member_category;
ALTER TYPE organization_member_category_new RENAME TO organization_member_category;
```

- [ ] **Step 1.2: Run migration in Supabase SQL editor**

Open Supabase dashboard → SQL editor → paste and run the migration.
Expected: no errors, table `organization_members` now has columns `school`, `research_areas`, `email`, `website`, `member_role`.

- [ ] **Step 1.3: Seed 4 core professors**

Run in Supabase SQL editor:

```sql
INSERT INTO organization_members (category, name, member_role, school, research_areas, email, website, image, summary, sort_order)
VALUES
  ('core', '曾建超教授', '主任', '美國南美以美大學（資工博士）', '軟體定義網路/NFV、DevOps雲原生', 'cctseng@cs.nycu.edu.tw', 'https://sites.google.com/view/cctseng', null, null, 1),
  ('core', '黃俊龍教授', '副主任', '國立台灣大學（電機博士）', '資料分析、資料探勘、區塊鏈', 'jlhuang@cs.nycu.edu.tw', 'http://www.cs.nycu.edu.tw/~jlhuang/', null, null, 2),
  ('core', '陳建志教授', '副主任', '國立陽明交通大學（資工博士）', 'AI/IoT、5G無線通訊、機器人', 'jenjee@nycu.edu.tw', 'https://people.cs.nycu.edu.tw/~chencz/', null, null, 3),
  ('core', '許懷中教授', '合聘專家', '逢甲大學', null, 'hwaijhsu@o365.fcu.edu.tw', null, null, null, 4);
```

- [ ] **Step 1.4: Commit migration file**

```bash
git add supabase/migrations/20260317000001_update_organization_members.sql
git commit -m "feat: add organization member schema fields and new categories"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 2.1: Update `OrganizationMemberCategory` and `OrganizationMember`**

In `lib/supabase/types.ts`, replace the existing `OrganizationMemberCategory` and `OrganizationMember` types:

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
  research_areas: string | null;
  email: string | null;
  website: string | null;
  member_role: string | null;
};
```

- [ ] **Step 2.2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | head -40
```

Expected: type errors only in `client.tsx` and `[id]/edit/page.tsx` (old category values — fixed in later tasks). No other type errors.

- [ ] **Step 2.3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: update OrganizationMember types with new fields"
```

---

## Task 3: Create OrgChart Component

**Files:**
- Create: `app/organization/org-chart.tsx`

This component renders a static org chart. Nodes are CSS Grid cells with Tailwind styling. An SVG overlay draws connector lines by measuring node positions with `useRef` + `ResizeObserver` (same pattern as Squircle in this codebase).

- [ ] **Step 3.1: Create the file**

```tsx
// app/organization/org-chart.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RefObject } from "react";

type Point = { x: number; y: number };
type Rect = { top: number; left: number; width: number; height: number };

function center(r: Rect): Point {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function topCenter(r: Rect): Point {
  return { x: r.left + r.width / 2, y: r.top };
}
function bottomCenter(r: Rect): Point {
  return { x: r.left + r.width / 2, y: r.top + r.height };
}
function leftCenter(r: Rect): Point {
  return { x: r.left, y: r.top + r.height / 2 };
}
function rightCenter(r: Rect): Point {
  return { x: r.left + r.width, y: r.top + r.height / 2 };
}

function getRelativeRect(el: HTMLElement, container: HTMLElement): Rect {
  const elRect = el.getBoundingClientRect();
  const conRect = container.getBoundingClientRect();
  return {
    top: elRect.top - conRect.top,
    left: elRect.left - conRect.left,
    width: elRect.width,
    height: elRect.height,
  };
}

// Org chart node component
function OrgNode({
  title,
  person,
  sub,
  nodeRef,
  className = "",
}: {
  title: string;
  person?: string;
  sub?: string;
  nodeRef: RefObject<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      ref={nodeRef}
      className={`flex flex-col items-center justify-center text-center px-3 py-2 rounded border-2 min-w-[110px] ${className}`}
    >
      <div className="text-xs font-semibold text-yellow-300">{title}</div>
      {person && <div className="text-xs font-bold text-yellow-300 mt-0.5">{person}</div>}
      {sub && <div className="text-[10px] text-yellow-200 mt-0.5">{sub}</div>}
    </div>
  );
}

export function OrgChart() {
  const containerRef = useRef<HTMLDivElement>(null!);

  // Node refs
  const directorRef = useRef<HTMLDivElement>(null!);
  const viceLeft = useRef<HTMLDivElement>(null!);
  const viceRight = useRef<HTMLDivElement>(null!);
  const jointRef = useRef<HTMLDivElement>(null!);
  const trainingRef = useRef<HTMLDivElement>(null!);
  const applyRef = useRef<HTMLDivElement>(null!);
  const legalRef = useRef<HTMLDivElement>(null!);
  const industryRef = useRef<HTMLDivElement>(null!);

  const [lines, setLines] = useState<React.ReactNode[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    setSvgSize({ w: cRect.width, h: cRect.height });

    const refs = [directorRef, viceLeft, viceRight, jointRef, trainingRef, applyRef, legalRef, industryRef];
    if (refs.some((r) => !r.current)) return;

    const [dir, vl, vr, jt, tr, ap, le, ind] = refs.map((r) =>
      getRelativeRect(r.current, container)
    );

    const elements: React.ReactNode[] = [];
    const stroke = "rgba(255,255,255,0.7)";
    const strokeW = 1.5;

    // 主任 → 副主任(左)
    const dirBot = bottomCenter(dir);
    const dirMid = { x: dirBot.x, y: dirBot.y + (topCenter(vl).y - dirBot.y) / 2 };
    const vlTop = topCenter(vl);
    elements.push(
      <polyline key="dir-vl" points={`${dirBot.x},${dirBot.y} ${dirBot.x},${dirMid.y} ${vlTop.x},${dirMid.y} ${vlTop.x},${vlTop.y}`} fill="none" stroke={stroke} strokeWidth={strokeW} />,
    );

    // 主任 → 副主任(右)
    const vrTop = topCenter(vr);
    elements.push(
      <polyline key="dir-vr" points={`${dirBot.x},${dirBot.y} ${dirBot.x},${dirMid.y} ${vrTop.x},${dirMid.y} ${vrTop.x},${vrTop.y}`} fill="none" stroke={stroke} strokeWidth={strokeW} />,
    );

    // 副主任(左) + 副主任(右) → 共用水平bar → 合聘/培訓/應用
    const vlBot = bottomCenter(vl);
    const vrBot = bottomCenter(vr);
    const barY = vlBot.y + (topCenter(jt).y - vlBot.y) / 2;
    const jtTop = topCenter(jt);
    const trTop = topCenter(tr);
    const apTop = topCenter(ap);

    // 副主任(左) 下到 bar
    elements.push(<line key="vl-bar" x1={vlBot.x} y1={vlBot.y} x2={vlBot.x} y2={barY} stroke={stroke} strokeWidth={strokeW} />);
    // 副主任(右) 下到 bar
    elements.push(<line key="vr-bar" x1={vrBot.x} y1={vrBot.y} x2={vrBot.x} y2={barY} stroke={stroke} strokeWidth={strokeW} />);
    // 水平 bar 從合聘到應用
    elements.push(<line key="bar-h" x1={jtTop.x} y1={barY} x2={apTop.x} y2={barY} stroke={stroke} strokeWidth={strokeW} />);
    // bar → 合聘
    elements.push(<line key="bar-jt" x1={jtTop.x} y1={barY} x2={jtTop.x} y2={jtTop.y} stroke={stroke} strokeWidth={strokeW} />);
    // bar → 培訓
    elements.push(<line key="bar-tr" x1={trTop.x} y1={barY} x2={trTop.x} y2={trTop.y} stroke={stroke} strokeWidth={strokeW} />);
    // bar → 應用
    elements.push(<line key="bar-ap" x1={apTop.x} y1={barY} x2={apTop.x} y2={apTop.y} stroke={stroke} strokeWidth={strokeW} />);

    // 虛線: 法人 → 產業 (通過中央)
    const leR = rightCenter(le);
    const indL = leftCenter(ind);
    elements.push(
      <line key="alliance" x1={leR.x} y1={leR.y} x2={indL.x} y2={indL.y} stroke={stroke} strokeWidth={strokeW} strokeDasharray="6 4" />,
    );

    // 聯盟 文字標籤 (兩側)
    const labelY = leR.y - 10;
    const labelXLeft = leR.x + 24;
    const labelXRight = indL.x - 24;
    elements.push(
      <text key="lbl-left" x={labelXLeft} y={labelY} textAnchor="middle" fontSize="11" fill={stroke} fontWeight="bold">聯盟</text>,
      <text key="lbl-right" x={labelXRight} y={labelY} textAnchor="middle" fontSize="11" fill={stroke} fontWeight="bold">聯盟</text>,
    );

    setLines(elements);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [recalculate]);

  return (
    <div className="w-full rounded-xl bg-[#1a3a8f] p-6 select-none">
      <h2 className="text-center text-xl font-bold text-white mb-6">AI專責辦公室組織架構</h2>
      <div ref={containerRef} className="relative" style={{ minHeight: 260 }}>
        {/* SVG overlay */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          width={svgSize.w}
          height={svgSize.h}
        >
          {lines}
        </svg>

        {/* 5-col × 3-row grid */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1.5fr 1.5fr 1.5fr 1fr", gridTemplateRows: "auto auto auto" }}>
          {/* Row 1: 主任 (col 3) */}
          <div /> {/* col 1 placeholder */}
          <div /> {/* col 2 placeholder */}
          <div className="flex justify-center">
            <OrgNode
              nodeRef={directorRef}
              title="主任"
              person="曾建超教授"
              sub="資訊學院"
              className="bg-[#2a4fa8] border-blue-300"
            />
          </div>
          <div /> {/* col 4 placeholder */}
          <div /> {/* col 5 placeholder */}

          {/* Row 2: 法人, 副主任×2, 産業 */}
          <div className="flex justify-center items-center">
            <OrgNode
              nodeRef={legalRef}
              title="法人"
              className="bg-[#6b3fa0] border-purple-300 w-full"
            />
          </div>
          <div className="flex justify-center">
            <OrgNode
              nodeRef={viceLeft}
              title="副主任"
              person="黃俊龍副院長"
              sub="資訊學院"
              className="bg-[#2a4fa8] border-blue-300"
            />
          </div>
          <div /> {/* col 3 row 2 empty */}
          <div className="flex justify-center">
            <OrgNode
              nodeRef={viceRight}
              title="副主任"
              person="陳建志所長"
              sub="智慧綠能學院"
              className="bg-[#1a7a4a] border-green-300"
            />
          </div>
          <div className="flex justify-center items-center">
            <OrgNode
              nodeRef={industryRef}
              title="產業"
              className="bg-[#c04a10] border-orange-300 w-full"
            />
          </div>

          {/* Row 3: 合聘, 培訓, 應用 */}
          <div /> {/* col 1 placeholder */}
          <div className="flex justify-center">
            <OrgNode
              nodeRef={jointRef}
              title="合聘專家"
              person="許懷中教授"
              sub="逢甲AI中心主任"
              className="bg-[#2a4fa8] border-blue-300"
            />
          </div>
          <div className="flex justify-center">
            <OrgNode
              nodeRef={trainingRef}
              title="培訓團隊"
              sub="（資訊技術中心）"
              className="bg-[#3a5fc0] border-blue-200"
            />
          </div>
          <div className="flex justify-center">
            <OrgNode
              nodeRef={applyRef}
              title="應用團隊"
              sub="（教授與實驗室）"
              className="bg-[#3a5fc0] border-blue-200"
            />
          </div>
          <div /> {/* col 5 placeholder */}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.2: Start dev server and verify org chart renders**

```bash
bun dev
```

Open `http://localhost:3000/organization` — expect: blue background org chart with nodes in correct positions and SVG lines connecting them.

- [ ] **Step 3.3: Commit**

```bash
git add app/organization/org-chart.tsx
git commit -m "feat: add static org chart component with SVG connectors"
```

---

## Task 4: Update `client.tsx` — 3 Tabs + New Member Cards

**Files:**
- Modify: `app/organization/client.tsx`

- [ ] **Step 4.1: Replace `client.tsx`**

```tsx
// app/organization/client.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgChart } from "./org-chart";
import { createClient } from "@/lib/supabase/client";
import type { OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { ExternalLink, Loader2, Mail, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TABS: { value: OrganizationMemberCategory; label: string }[] = [
  { value: "core", label: "核心成員" },
  { value: "legal_entity", label: "法人" },
  { value: "industry", label: "產業" },
];

export function OrganizationPageClient({
  membersByCategory,
  isAdmin,
}: {
  membersByCategory: Record<OrganizationMemberCategory, OrganizationMember[]>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<OrganizationMemberCategory>("core");
  const [isCreating, setIsCreating] = useState(false);

  const members = membersByCategory[tab] ?? [];

  const handleCreate = async () => {
    if (!isAdmin) return;
    setIsCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organization_members")
      .insert({
        category: tab,
        name: "新成員",
        summary: null,
        image: null,
        link: null,
        sort_order: 0,
        school: null,
        research_areas: null,
        email: null,
        website: null,
        member_role: null,
      })
      .select()
      .single();
    if (error) { setIsCreating(false); return; }
    router.push(`/organization/${data.id}/edit`);
  };

  const handleCardClick = (member: OrganizationMember) => {
    if (isAdmin) {
      router.push(`/organization/${member.id}/edit`);
      return;
    }
    if (member.website) {
      window.open(member.website, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-10">
      {/* Org Chart */}
      <OrgChart />

      {/* Member Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 border-b border-border pb-2 flex-1">
            {TABS.map(({ value, label }) => (
              <Button
                key={value}
                variant={tab === value ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          {/* 新增 button hidden for core tab */}
          {isAdmin && tab !== "core" && (
            <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              新增
            </Button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">此分類目前沒有成員</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => {
              const isClickable = isAdmin || !!member.website;
              return (
                <Card
                  key={member.id}
                  className={`py-0 h-full flex flex-col overflow-hidden ${
                    isClickable ? "cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]" : ""
                  }`}
                  onClick={isClickable ? () => handleCardClick(member) : undefined}
                >
                  {/* Photo */}
                  <div className="relative w-full aspect-square shrink-0 overflow-hidden">
                    <Image
                      src={member.image || "/placeholder.png"}
                      alt={member.name}
                      fill
                      className="object-cover"
                      unoptimized={isExternalImage(member.image)}
                    />
                  </div>

                  <CardHeader className="shrink-0 pb-2 pt-4">
                    <CardTitle className="text-lg font-bold">{member.name}</CardTitle>
                    {member.member_role && (
                      <p className="text-sm text-muted-foreground">{member.member_role}</p>
                    )}
                  </CardHeader>

                  <CardContent className="flex flex-col gap-2 pb-4 text-sm">
                    {member.school && (
                      <div>
                        <span className="text-muted-foreground text-xs">最高學歷　</span>
                        <span>{member.school}</span>
                      </div>
                    )}
                    {member.research_areas && (
                      <div>
                        <span className="text-muted-foreground text-xs">研究領域　</span>
                        <span>{member.research_areas}</span>
                      </div>
                    )}
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate">{member.email}</span>
                      </a>
                    )}
                    {member.website && (
                      <a
                        href={member.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate">個人網頁</span>
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2: Verify in browser**

Open `http://localhost:3000/organization`.
- Tab「核心成員」shows 4 professor cards with school/research/email/website fields
- Tab「法人」and「產業」show empty state
- As admin: 新增 button visible on 法人/産業 tabs, hidden on 核心成員

- [ ] **Step 4.3: Commit**

```bash
git add app/organization/client.tsx
git commit -m "feat: update organization client with 3 tabs and new member card layout"
```

---

## Task 5: Update `page.tsx`

**Files:**
- Modify: `app/organization/page.tsx`

The existing `page.tsx` already uses `select("*")` and passes all members. The only change needed is updating the `CATEGORIES` constant to use the new enum values.

- [ ] **Step 5.1: Update CATEGORIES array in `page.tsx`**

In `app/organization/page.tsx`, change:
```ts
const CATEGORIES: OrganizationMemberCategory[] = ["ai_newcomer", "industry_academy", "alumni"];
```
to:
```ts
const CATEGORIES: OrganizationMemberCategory[] = ["core", "legal_entity", "industry"];
```

- [ ] **Step 5.2: Build check**

```bash
bun run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 5.3: Commit**

```bash
git add app/organization/page.tsx
git commit -m "feat: update organization page categories to new enum values"
```

---

## Task 6: Update Edit Page

**Files:**
- Modify: `app/organization/[id]/edit/page.tsx`

- [ ] **Step 6.1: Update CATEGORIES constant**

Change:
```ts
const CATEGORIES: { value: OrganizationMemberCategory; label: string }[] = [
  { value: "ai_newcomer", label: "AI新秀" },
  { value: "industry_academy", label: "產學聯盟" },
  { value: "alumni", label: "校友" },
];
```
to:
```ts
const CATEGORIES: { value: OrganizationMemberCategory; label: string }[] = [
  { value: "core", label: "核心成員" },
  { value: "legal_entity", label: "法人" },
  { value: "industry", label: "產業" },
];
```

- [ ] **Step 6.2: Extend `hasChanges` to include new fields**

Replace the `hasChanges` expression:
```ts
const hasChanges =
  member && savedMember
    ? member.name !== savedMember.name ||
      (member.summary ?? "") !== (savedMember.summary ?? "") ||
      (member.image ?? "") !== (savedMember.image ?? "") ||
      (member.link ?? "") !== (savedMember.link ?? "") ||
      member.category !== savedMember.category ||
      member.sort_order !== savedMember.sort_order
    : false;
```
with:
```ts
const hasChanges =
  member && savedMember
    ? member.name !== savedMember.name ||
      (member.summary ?? "") !== (savedMember.summary ?? "") ||
      (member.image ?? "") !== (savedMember.image ?? "") ||
      (member.link ?? "") !== (savedMember.link ?? "") ||
      member.category !== savedMember.category ||
      member.sort_order !== savedMember.sort_order ||
      (member.school ?? "") !== (savedMember.school ?? "") ||
      (member.research_areas ?? "") !== (savedMember.research_areas ?? "") ||
      (member.email ?? "") !== (savedMember.email ?? "") ||
      (member.website ?? "") !== (savedMember.website ?? "") ||
      (member.member_role ?? "") !== (savedMember.member_role ?? "")
    : false;
```

- [ ] **Step 6.3: Extend `handleSave` to include new fields**

In `handleSave`, add the new fields to the `.update({...})` call:
```ts
const { error } = await supabase
  .from("organization_members")
  .update({
    name: member.name,
    summary: member.summary || null,
    image: member.image || null,
    link: member.link || null,
    category: member.category,
    sort_order: member.sort_order,
    school: member.school || null,
    research_areas: member.research_areas || null,
    email: member.email || null,
    website: member.website || null,
    member_role: member.member_role || null,
  })
  .eq("id", id);
```

- [ ] **Step 6.4: Add form fields for new columns**

After the existing「排序」field and before the action buttons, add:

```tsx
<div className="grid gap-2">
  <Label>職稱（選填）</Label>
  <Input
    value={member.member_role ?? ""}
    onChange={(e) => setMember({ ...member, member_role: e.target.value || null })}
    placeholder="例：主任、副主任、合聘專家"
  />
</div>

<div className="grid gap-2">
  <Label>最高學歷（選填）</Label>
  <Input
    value={member.school ?? ""}
    onChange={(e) => setMember({ ...member, school: e.target.value || null })}
    placeholder="例：國立台灣大學（電機博士）"
  />
</div>

<div className="grid gap-2">
  <Label>研究領域（選填）</Label>
  <Textarea
    className="min-h-[80px] resize-y"
    value={member.research_areas ?? ""}
    onChange={(e) => setMember({ ...member, research_areas: e.target.value || null })}
    placeholder="研究領域（以頓號或換行分隔）"
  />
</div>

<div className="grid gap-2">
  <Label>Email（選填）</Label>
  <Input
    type="email"
    value={member.email ?? ""}
    onChange={(e) => setMember({ ...member, email: e.target.value || null })}
    placeholder="professor@university.edu.tw"
  />
</div>

<div className="grid gap-2">
  <Label>個人網頁（選填）</Label>
  <Input
    type="url"
    value={member.website ?? ""}
    onChange={(e) => setMember({ ...member, website: e.target.value || null })}
    placeholder="https://..."
  />
</div>
```

- [ ] **Step 6.5: Build and verify**

```bash
bun run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: clean build.

Open `http://localhost:3000/organization/[any-member-id]/edit` — verify new form fields appear and save correctly.

- [ ] **Step 6.6: Commit**

```bash
git add app/organization/[id]/edit/page.tsx
git commit -m "feat: add new member fields to organization edit page"
```

---

## Task 7: Final Verification

- [ ] **Step 7.1: Full build check**

```bash
bun run build
```

Expected: successful build with no type errors.

- [ ] **Step 7.2: Visual check at `http://localhost:3000/organization`**

Verify:
- [ ] Org chart renders with correct node positions (主任 center top, 副主任×2 middle, etc.)
- [ ] SVG connector lines appear between nodes
- [ ] Dashed line with 聯盟 labels connects 法人 and 産業 nodes
- [ ] 核心成員 tab shows 4 professor cards
- [ ] Each card shows: name, member_role, school, research_areas, email link, website link
- [ ] Email links open mailto:, website links open in new tab
- [ ] 法人 / 産業 tabs show empty state message
- [ ] As admin: 新增 button is visible on 法人/産業, hidden on 核心成員

- [ ] **Step 7.3: Final commit**

```bash
git add -A
git commit -m "feat: complete organization page redesign with org chart and member tabs"
```
