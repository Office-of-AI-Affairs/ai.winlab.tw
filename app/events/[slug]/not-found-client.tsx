"use client";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Rendered when /events/[slug] can't find a published event. Admins may be
// looking at their own draft — send them straight to the editor.
export function EventDetailNotFoundClient({ slug }: { slug: string }) {
  const { isAdmin, isLoading } = useAuth();

  return (
    <PageShell>
      <div className="flex flex-col items-center gap-4 py-20">
        <h1 className="text-2xl font-bold">找不到這個活動</h1>
        <p className="text-muted-foreground">
          可能已被移除、尚未發布，或網址有誤。
        </p>
        <div className="flex gap-3 mt-2">
          <Button asChild variant="secondary">
            <Link href="/events">返回活動列表</Link>
          </Button>
          {isAdmin && !isLoading && (
            <Button asChild>
              <Link href={`/events/${slug}/edit`}>開啟編輯</Link>
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
