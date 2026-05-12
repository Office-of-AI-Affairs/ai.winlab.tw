# Design System Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page living styleguide at `/design` that showcases all design tokens, UI components, and patterns used by ai.winlab.tw.

**Architecture:** One server component page renders all static sections (colors, typography, spacing, components). A client sidebar component handles scroll-spy navigation via IntersectionObserver. A client interactive component wraps all stateful demos (Dialog, AlertDialog, DropdownMenu, Popover, Collapsible, Toast triggers). No new dependencies.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, shadcn/ui (new-york), Radix UI, sonner, lucide-react

---

### Task 0: Prerequisite — Load Instrument Serif Font

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add Instrument Serif to layout.tsx**

Add the Google Font import alongside the existing Noto Sans fonts:

```tsx
import { Instrument_Serif, Noto_Sans, Noto_Sans_Mono } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});
```

Update the body className to include the new variable:

```tsx
<body className={`${notoSans.variable} ${notoSansMono.variable} ${instrumentSerif.variable} antialiased`}>
```

- [ ] **Step 2: Verify build**

Run: `bun build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: load Instrument Serif font for decorative typography"
```

---

### Task 1: Sidebar with Scroll Spy

**Files:**
- Create: `app/design/sidebar.tsx`

The sidebar needs to be built first because the page layout depends on it.

- [ ] **Step 1: Create sidebar.tsx**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const sections = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing & Radius" },
  { id: "components", label: "Components" },
  { id: "patterns", label: "Patterns" },
];

export function DesignSidebar() {
  const [activeId, setActiveId] = useState(sections[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          );
          setActiveId(topmost.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  function handleClick(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveId(id);
    }
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:block sticky top-20 self-start w-56 shrink-0">
        <ul className="flex flex-col gap-1">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleClick(id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors duration-200",
                  activeId === id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile horizontal nav */}
      <nav className="lg:hidden sticky top-16 z-10 -mx-4 bg-background/95 backdrop-blur border-b px-4 py-2 overflow-x-auto">
        <ul className="flex gap-4 min-w-max">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleClick(id)}
                className={cn(
                  "text-sm whitespace-nowrap pb-1 transition-colors duration-200",
                  activeId === id
                    ? "text-primary font-medium border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `bun lint`
Expected: 0 errors (existing warnings are fine)

- [ ] **Step 3: Commit**

```bash
git add app/design/sidebar.tsx
git commit -m "feat: add design system sidebar with scroll spy"
```

---

### Task 2: Interactive Component Demos

**Files:**
- Create: `app/design/interactive.tsx`

All stateful/client-side demos live here — Dialog, AlertDialog, DropdownMenu, Popover, Collapsible, Toast triggers.

- [ ] **Step 1: Create interactive.tsx**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronsUpDown, Mail, Plus, Settings, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a demo dialog. It can contain any content you need.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Dialog body content goes here.
        </div>
        <DialogFooter showCloseButton>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Item</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原，資料將永久刪除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive">刪除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DropdownMenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Mail />
            Messages
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Plus />
            Invite
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Email</DropdownMenuItem>
            <DropdownMenuItem>Link</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PopoverDemo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Popover Title</PopoverTitle>
          <PopoverDescription>
            This is a popover with header and description.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export function SelectDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Default</Label>
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option-1">Option 1</SelectItem>
            <SelectItem value="option-2">Option 2</SelectItem>
            <SelectItem value="option-3">Option 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Disabled</Label>
        <Select disabled>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="x">X</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function CheckboxDemo() {
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="check-on"
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
        />
        <Label htmlFor="check-on">Checked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="check-off" />
        <Label htmlFor="check-off">Unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="check-disabled" disabled />
        <Label htmlFor="check-disabled" className="opacity-50">
          Disabled
        </Label>
      </div>
    </div>
  );
}

export function CollapsibleDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">3 items</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <ChevronsUpDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="mt-2 rounded-md border px-4 py-2 text-sm">
        Always visible item
      </div>
      <CollapsibleContent className="mt-2 space-y-2">
        <div className="rounded-md border px-4 py-2 text-sm">Hidden item 1</div>
        <div className="rounded-md border px-4 py-2 text-sm">Hidden item 2</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ToastDemo() {
  return (
    <div className="flex gap-3 flex-wrap">
      <Button
        variant="outline"
        onClick={() => toast.success("操作成功")}
      >
        Success Toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error("操作失敗")}
      >
        Error Toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("提示訊息")}
      >
        Info Toast
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `bun lint`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add app/design/interactive.tsx
git commit -m "feat: add interactive component demos for design system"
```

---

### Task 3: Main Design Page — Tokens Sections (Colors, Typography, Spacing)

**Files:**
- Create: `app/design/page.tsx`

Build the page with the first three sections: Hero, Colors, Typography, Spacing & Radius. Components and Patterns will be added in the next task.

- [ ] **Step 1: Create page.tsx with token sections**

```tsx
import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Block } from "@/components/ui/block";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SubButton } from "@/components/ui/sub-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { ArrowLeft, Heart, Mail, Plus, Search, Settings, Star } from "lucide-react";
import { DesignSidebar } from "./sidebar";
import {
  AlertDialogDemo,
  CheckboxDemo,
  CollapsibleDemo,
  DialogDemo,
  DropdownMenuDemo,
  PopoverDemo,
  SelectDemo,
  ToastDemo,
} from "./interactive";

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="text-2xl font-bold scroll-mt-24">
      {title}
    </h2>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function ColorSwatch({
  label,
  variable,
  className,
  textClassName,
}: {
  label: string;
  variable: string;
  className: string;
  textClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`h-20 rounded-xl border border-border flex items-end p-3 ${className}`}
      >
        <span className={`text-xs font-mono ${textClassName ?? ""}`}>{variable}</span>
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="mb-16">
        <h1 className="text-5xl font-bold tracking-tight">Design System</h1>
        <p className="text-lg text-muted-foreground mt-3">
          The building blocks of ai.winlab.tw
        </p>
      </div>

      <div className="flex gap-12">
        <DesignSidebar />

        <div className="flex-1 min-w-0 flex flex-col gap-20">
          {/* ── Colors ── */}
          <section className="flex flex-col gap-8">
            <SectionHeading id="colors" title="Colors" />

            <SubSection title="Primary">
              <div className="flex gap-4 items-center">
                <div className="w-32 h-32 rounded-2xl bg-primary flex items-end p-4">
                  <span className="text-primary-foreground text-sm font-mono">#0033a0</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">NYCU Blue</span>
                  <span className="text-sm text-muted-foreground font-mono">--primary: #0033a0</span>
                </div>
              </div>
            </SubSection>

            <SubSection title="Semantic Tokens">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <ColorSwatch label="Background" variable="--background" className="bg-background" textClassName="text-foreground" />
                <ColorSwatch label="Foreground" variable="--foreground" className="bg-foreground" textClassName="text-background" />
                <ColorSwatch label="Card" variable="--card" className="bg-card" textClassName="text-card-foreground" />
                <ColorSwatch label="Muted" variable="--muted" className="bg-muted" textClassName="text-muted-foreground" />
                <ColorSwatch label="Accent" variable="--accent" className="bg-accent" textClassName="text-accent-foreground" />
                <ColorSwatch label="Secondary" variable="--secondary" className="bg-secondary" textClassName="text-secondary-foreground" />
                <ColorSwatch label="Popover" variable="--popover" className="bg-popover" textClassName="text-popover-foreground" />
                <ColorSwatch label="Destructive" variable="--destructive" className="bg-destructive" textClassName="text-white" />
                <ColorSwatch label="Border" variable="--border" className="bg-border" />
                <ColorSwatch label="Input" variable="--input" className="bg-input" />
                <ColorSwatch label="Ring" variable="--ring" className="bg-ring" textClassName="text-white" />
              </div>
            </SubSection>

            <SubSection title="Chart Colors">
              <div className="flex gap-0 rounded-xl overflow-hidden border border-border">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`h-16 flex-1 flex items-center justify-center`}
                    style={{ backgroundColor: `var(--chart-${n})` }}
                  >
                    <span className="text-xs font-mono text-white mix-blend-difference">
                      chart-{n}
                    </span>
                  </div>
                ))}
              </div>
            </SubSection>
          </section>

          {/* ── Typography ── */}
          <section className="flex flex-col gap-8">
            <SectionHeading id="typography" title="Typography" />

            <SubSection title="Font Families">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Noto Sans — UI</p>
                  <p className="font-sans text-2xl">
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Noto Sans Mono — Code</p>
                  <p className="font-mono text-2xl">
                    const hello = &quot;world&quot;;
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Instrument Serif — Decorative</p>
                  <p className="text-2xl" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
              </div>
            </SubSection>

            <SubSection title="Heading Scale">
              <div className="flex flex-col gap-4 prose max-w-none">
                <h1>Heading 1 — text-4xl extrabold</h1>
                <h2 className="!border-0 !mt-0 !pb-0">Heading 2 — text-3xl semibold</h2>
                <h3 className="!mt-0">Heading 3 — text-2xl semibold</h3>
                <h4 className="!mt-0">Heading 4 — text-xl semibold</h4>
              </div>
            </SubSection>

            <SubSection title="Body & Code">
              <div className="flex flex-col gap-3">
                <p className="text-base">Body text — text-base / leading-7</p>
                <p className="text-sm text-muted-foreground">
                  Small text — text-sm / text-muted-foreground
                </p>
                <p>
                  Inline <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">code snippet</code> within text
                </p>
              </div>
            </SubSection>

            <SubSection title="Font Weights">
              <div className="flex flex-wrap gap-6 text-lg">
                <span className="font-normal">Regular 400</span>
                <span className="font-medium">Medium 500</span>
                <span className="font-semibold">Semibold 600</span>
                <span className="font-bold">Bold 700</span>
                <span className="font-extrabold">Extrabold 800</span>
              </div>
            </SubSection>
          </section>

          {/* ── Spacing & Radius ── */}
          <section className="flex flex-col gap-8">
            <SectionHeading id="spacing" title="Spacing & Radius" />

            <SubSection title="Border Radius">
              <div className="flex gap-8 items-end flex-wrap">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 border-2 border-primary rounded-sm" />
                  <span className="text-sm text-muted-foreground">rounded-sm/md</span>
                  <span className="text-xs font-mono">1rem</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 border-2 border-primary rounded-lg" />
                  <span className="text-sm text-muted-foreground">rounded-lg+</span>
                  <span className="text-xs font-mono">2rem</span>
                </div>
              </div>
            </SubSection>

            <SubSection title="PageShell Tones">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: "content", value: "py-12 gap-8" },
                  { name: "contentLoose", value: "py-12 gap-10" },
                  { name: "dashboard", value: "p-4 gap-4" },
                  { name: "admin", value: "py-8 gap-8" },
                  { name: "editor", value: "mt-8 pb-16" },
                  { name: "centeredState", value: "py-12 centered" },
                  { name: "auth", value: "centered full-height" },
                  { name: "profile", value: "full-width" },
                ].map(({ name, value }) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <code className="text-sm font-mono font-medium">{name}</code>
                    <span className="text-sm text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </SubSection>
          </section>

          {/* ── Components ── */}
          <section className="flex flex-col gap-12">
            <SectionHeading id="components" title="Components" />

            {/* Button */}
            <SubSection title="Button">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button size="icon-sm"><Star /></Button>
                  <Button size="icon"><Star /></Button>
                  <Button size="icon-lg"><Star /></Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" disabled>Disabled Outline</Button>
                </div>
              </div>
            </SubSection>

            {/* Badge */}
            <SubSection title="Badge">
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="ghost">Ghost</Badge>
                <Badge variant="link">Link</Badge>
              </div>
            </SubSection>

            {/* Card */}
            <SubSection title="Card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">Basic card with padding</p>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description text</CardDescription>
                    <CardAction>
                      <Button variant="ghost" size="icon-sm"><Settings /></Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Card body content goes here.</p>
                  </CardContent>
                  <CardFooter className="justify-end gap-2">
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button size="sm">Save</Button>
                  </CardFooter>
                </Card>
              </div>
            </SubSection>

            {/* Block */}
            <SubSection title="Block">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Block>
                  <span className="text-sm">Default</span>
                </Block>
                <Block variant="outline">
                  <span className="text-sm">Outline</span>
                </Block>
                <Block variant="ghost">
                  <span className="text-sm">Ghost</span>
                </Block>
              </div>
            </SubSection>

            {/* Input & Textarea */}
            <SubSection title="Input">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="input-default">Default</Label>
                  <Input id="input-default" placeholder="Type something..." />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="input-disabled">Disabled</Label>
                  <Input id="input-disabled" placeholder="Can't touch this" disabled />
                </div>
              </div>
            </SubSection>

            <SubSection title="Textarea">
              <div className="max-w-md flex flex-col gap-2">
                <Label htmlFor="textarea-default">Default</Label>
                <Textarea id="textarea-default" placeholder="Write something longer..." />
              </div>
            </SubSection>

            {/* Select */}
            <SubSection title="Select">
              <SelectDemo />
            </SubSection>

            {/* Checkbox */}
            <SubSection title="Checkbox">
              <CheckboxDemo />
            </SubSection>

            {/* Dialog */}
            <SubSection title="Dialog">
              <DialogDemo />
            </SubSection>

            {/* Alert Dialog */}
            <SubSection title="Alert Dialog">
              <AlertDialogDemo />
            </SubSection>

            {/* Dropdown Menu */}
            <SubSection title="Dropdown Menu">
              <DropdownMenuDemo />
            </SubSection>

            {/* Popover */}
            <SubSection title="Popover">
              <PopoverDemo />
            </SubSection>

            {/* Avatar */}
            <SubSection title="Avatar">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 flex-wrap">
                  {(["sm", "default", "lg", "xl", "2xl", "3xl", "4xl"] as const).map((size) => (
                    <Avatar key={size} size={size}>
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Avatar size="xl">
                    <AvatarImage src="/og.png" alt="Demo" />
                    <AvatarFallback>OG</AvatarFallback>
                  </Avatar>
                  <Avatar size="xl">
                    <AvatarFallback>LK</AvatarFallback>
                  </Avatar>
                </div>
                <AvatarGroup>
                  <Avatar><AvatarFallback>A</AvatarFallback></Avatar>
                  <Avatar><AvatarFallback>B</AvatarFallback></Avatar>
                  <Avatar><AvatarFallback>C</AvatarFallback></Avatar>
                  <AvatarGroupCount>+5</AvatarGroupCount>
                </AvatarGroup>
              </div>
            </SubSection>

            {/* Table */}
            <SubSection title="Table">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: "Alice", role: "Admin" },
                      { name: "Bob", role: "Vendor" },
                      { name: "Charlie", role: "User" },
                    ].map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SubSection>

            {/* Separator */}
            <SubSection title="Separator">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm mb-2">Horizontal</p>
                  <Separator />
                </div>
                <div className="flex items-center gap-4 h-8">
                  <span className="text-sm">Left</span>
                  <Separator orientation="vertical" />
                  <span className="text-sm">Right</span>
                </div>
              </div>
            </SubSection>

            {/* Skeleton */}
            <SubSection title="Skeleton">
              <div className="flex flex-col gap-4 max-w-sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            </SubSection>

            {/* Label */}
            <SubSection title="Label">
              <div className="flex flex-col gap-2 max-w-xs">
                <Label htmlFor="label-demo">Label text</Label>
                <Input id="label-demo" placeholder="Associated input" />
              </div>
            </SubSection>

            {/* SubButton */}
            <SubSection title="SubButton">
              <div className="flex gap-4">
                <SubButton href="/">
                  <ArrowLeft className="w-4 h-4" />
                  Link style
                </SubButton>
                <SubButton onClick={() => {}}>
                  <Search className="w-4 h-4" />
                  Button style
                </SubButton>
              </div>
            </SubSection>

            {/* Collapsible */}
            <SubSection title="Collapsible">
              <CollapsibleDemo />
            </SubSection>
          </section>

          {/* ── Patterns ── */}
          <section className="flex flex-col gap-8">
            <SectionHeading id="patterns" title="Patterns" />

            <SubSection title="Interactive Scale">
              <div className="flex gap-4">
                <div className="interactive-scale w-24 h-24 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm cursor-pointer">
                  Hover me
                </div>
              </div>
            </SubSection>

            <SubSection title="Nav Bracket">
              <div className="flex gap-6">
                <span className="nav-bracket relative text-sm font-medium cursor-pointer">
                  Hover me
                </span>
                <span className="nav-bracket nav-bracket-active relative text-sm font-medium cursor-pointer">
                  Active
                </span>
              </div>
            </SubSection>

            <SubSection title="Empty State">
              <div className="text-center py-8 text-muted-foreground border rounded-xl border-dashed">
                尚無公告
              </div>
            </SubSection>

            <SubSection title="Status Badges">
              <div className="flex gap-3">
                <Badge>已發布</Badge>
                <Badge variant="secondary">草稿</Badge>
              </div>
            </SubSection>

            <SubSection title="Toast">
              <ToastDemo />
            </SubSection>

            <SubSection title="AppLink">
              <div className="flex gap-4">
                <AppLink href="/" className="text-sm text-primary underline underline-offset-4">
                  Internal link →
                </AppLink>
                <AppLink href="https://ai.winlab.tw" className="text-sm text-primary underline underline-offset-4">
                  External link ↗
                </AppLink>
              </div>
            </SubSection>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `bun build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify in browser**

Run: `bun dev`, navigate to `http://localhost:3000/design`
Expected: All sections render correctly — colors show as swatches, typography specimens display in correct fonts, component variants render properly, interactive demos (dialogs, menus, toasts) work on click

- [ ] **Step 4: Commit**

```bash
git add app/design/page.tsx
git commit -m "feat: add /design page with full design system showcase"
```

---

### Task 4: Visual Polish & Mobile Responsiveness

**Files:**
- Modify: `app/design/page.tsx`
- Modify: `app/design/sidebar.tsx`

- [ ] **Step 1: Browser test at 375px width**

Resize browser to 375px. Check:
- Mobile nav appears at top, desktop sidebar is hidden
- Color swatches grid collapses to 2 columns
- Component grids stack to single column
- No horizontal overflow

- [ ] **Step 2: Fix any responsive issues found**

Common fixes needed:
- Ensure all `flex-wrap` is applied to component demo rows
- Verify `max-w-xl` / `max-w-md` constraints on form demos don't break mobile
- Check that the mobile nav scrolls horizontally without page overflow

- [ ] **Step 3: Verify full page in desktop and mobile**

Run through all sections in both viewports. All interactive demos should work. Scroll spy should highlight correctly.

- [ ] **Step 4: Commit**

```bash
git add app/design/page.tsx app/design/sidebar.tsx
git commit -m "fix: polish design system page responsive layout"
```

---

### Task 5: Final Verification & Build

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

Run: `bun lint`
Expected: 0 errors

- [ ] **Step 2: Run build**

Run: `bun build`
Expected: Build succeeds, `/design` appears in route list

- [ ] **Step 3: Full browser walkthrough**

Navigate to `http://localhost:3000/design` and verify:
- [ ] Hero renders with title and tagline
- [ ] Colors section: primary swatch, semantic tokens grid, chart color strip
- [ ] Typography: all 3 font specimens, heading scale, weights
- [ ] Spacing: radius comparison, all 8 PageShell tones listed
- [ ] All component variants render correctly
- [ ] All interactive demos work (Dialog, AlertDialog, DropdownMenu, Popover, Select, Checkbox, Collapsible, Toast)
- [ ] Sidebar scroll spy highlights active section
- [ ] Mobile nav works at 375px width
- [ ] No console errors

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete design system page at /design"
```
