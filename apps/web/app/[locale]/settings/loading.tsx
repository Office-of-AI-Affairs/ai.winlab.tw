import { PageShell } from "@/components/page-shell"
import { SettingsMenuSkeleton } from "@/components/settings-menu"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <PageShell className="block">
      <Skeleton className="mb-8 h-9 w-32 rounded-lg" />
      <SettingsMenuSkeleton items={3} />
    </PageShell>
  )
}
