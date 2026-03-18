import { BlockSkeleton } from "@/components/ui/block"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-10">
      <Skeleton className="h-9 w-24 rounded-lg" />
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <BlockSkeleton key={index} variant="outline" size="auto" showMedia lines={2} />
        ))}
      </div>
    </div>
  );
}
