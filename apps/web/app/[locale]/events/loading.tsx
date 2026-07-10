import { EventCardSkeleton } from "@/components/event-card"
import { PageShell } from "@/components/page-shell"
import { BlockSkeleton } from "@/components/ui/block"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <PageShell tone="dashboard">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="w-full grid lg:grid-cols-3 gap-4">
        <div className="col-span-1">
          <BlockSkeleton lines={2} />
        </div>
        <div className="col-span-1 lg:col-span-2 grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <EventCardSkeleton key={index} compact />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
