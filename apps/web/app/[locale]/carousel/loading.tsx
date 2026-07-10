import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell>
      <Skeleton className="h-5 w-20 rounded-md" />

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 p-4">
              <Skeleton className="w-full sm:w-48 aspect-video shrink-0 rounded-md" />
              <div className="flex-1 flex flex-col justify-center gap-2">
                <Skeleton className="h-4 w-12 rounded-md" />
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
