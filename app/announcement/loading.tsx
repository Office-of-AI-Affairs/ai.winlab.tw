import { AnnouncementTableSkeleton } from "@/components/announcement-table"
import { PageShell } from "@/components/page-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <AnnouncementTableSkeleton rows={6} />
    </PageShell>
  );
}
