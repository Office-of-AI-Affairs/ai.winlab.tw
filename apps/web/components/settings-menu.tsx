import { ChevronRight, type LucideIcon } from "lucide-react"

import { AppLink } from "@/components/app-link"
import { Skeleton } from "@/components/ui/skeleton"

export type SettingsMenuItem = {
  href: string
  icon: LucideIcon
  label: string
  description: string
}

function SettingsMenu({ items }: { items: SettingsMenuItem[] }) {
  return (
    <div className="flex flex-col divide-y overflow-hidden rounded-2xl border border-border">
      {items.map(({ href, icon: Icon, label, description }) => (
        <AppLink
          key={href}
          href={href}
          className="group flex items-center gap-4 px-6 py-5 hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </AppLink>
      ))}
    </div>
  )
}

function SettingsMenuSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div
      data-slot="settings-menu-skeleton"
      className="flex flex-col divide-y overflow-hidden rounded-2xl border border-border"
    >
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-6 py-5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
        </div>
      ))}
    </div>
  )
}

export { SettingsMenu, SettingsMenuSkeleton }
