import { BlockSkeleton } from "@/components/ui/block"
import { PageShell } from "@/components/page-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <PageShell>
      <Skeleton className="h-10 w-2/3 rounded-lg" />
      <BlockSkeleton lines={8} size="auto" />
    </PageShell>
  );
}
