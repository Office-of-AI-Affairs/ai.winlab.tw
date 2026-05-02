import { BlockSkeleton } from "@/components/ui/block"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-2 flex items-start justify-between gap-4">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <Skeleton className="mb-10 h-4 w-72 rounded" />
      <BlockSkeleton lines={8} size="auto" />
    </div>
  )
}
