import { AnnouncementTableSkeleton } from "@/components/announcement-table"
import { PageShell } from "@/components/page-shell"
import { RecruitmentCardSkeleton } from "@/components/recruitment-card"
import { ResultCardSkeleton } from "@/components/result-card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <PageShell>
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-col gap-4">
        <Skeleton className="w-full aspect-[3/1] rounded-[2rem]" />
        <Skeleton className="h-9 w-1/2 rounded-lg" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-14 rounded-lg" />
        ))}
      </div>
      <AnnouncementTableSkeleton rows={5} />
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <ResultCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <RecruitmentCardSkeleton key={index} />
        ))}
      </div>
    </PageShell>
  );
}
