import { PageShell } from "@/components/shared/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { UsersTableSkeleton } from "@/components/admin/users-table"

export default function Loading() {
  return (
    <PageShell className="block">
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-lg" />
      </div>
      <UsersTableSkeleton rows={6} />
    </PageShell>
  )
}
