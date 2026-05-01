"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { TocItem } from "@/lib/ui/article"

type Props = {
  items: TocItem[]
  className?: string
}

export function Toc({ items, className }: Props) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null)

  useEffect(() => {
    if (items.length === 0) return
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null)
    if (headings.length === 0) return

    // Track which ids are currently in the "reading window". rootMargin puts
    // the activation band roughly between the sticky header (top ~80px) and
    // the lower 45% of the viewport, so the active link tracks where the
    // reader's eye is, not where every heading happens to flicker into view.
    const visibleIds = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleIds.add(entry.target.id)
          else visibleIds.delete(entry.target.id)
        }
        if (visibleIds.size === 0) return
        for (const item of items) {
          if (visibleIds.has(item.id)) {
            setActiveId(item.id)
            break
          }
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 1] },
    )
    for (const h of headings) observer.observe(h)
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <aside
      className={cn(
        "w-48 shrink-0 sticky top-20 self-start max-h-[calc(100dvh-6rem)] overflow-y-auto",
        className,
      )}
      aria-label="本頁目錄"
    >
      <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
        本頁目錄
      </p>
      <ol className="flex flex-col gap-1.5 text-sm">
        {items.map((item) => {
          const indent = Math.min(Math.max(item.level - 1, 0), 3)
          const isActive = activeId === item.id
          return (
            <li key={item.id} style={{ paddingLeft: `${indent * 0.75}rem` }}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "block py-0.5 transition-colors duration-200 leading-snug line-clamp-2",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.text}
              </a>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
