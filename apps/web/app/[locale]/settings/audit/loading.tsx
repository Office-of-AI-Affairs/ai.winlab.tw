import { PageShell } from "@/components/shared/page-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <PageShell className="block">
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-lg" />
      </div>
      <Skeleton className="mb-6 h-9 w-48 rounded-lg" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-48 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </PageShell>
  )
}
