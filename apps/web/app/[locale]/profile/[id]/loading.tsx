import { PageShell } from "@/components/page-shell"
import { BlockSkeleton } from "@/components/ui/block"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="flex items-center justify-center">
      <PageShell tone="profile">
        <div className="grid p-4 gap-4">
          <div className="flex items-center justify-between p-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="w-full grid lg:grid-cols-3 gap-4">
            <div className="col-span-1">
              <div className="rounded-[2rem] border border-border p-6 flex flex-col gap-4">
                <Skeleton className="size-20 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            </div>
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <BlockSkeleton key={index} variant="outline" size="auto" showMedia lines={3} />
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    </main>
  );
}
