"use client";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import Link from "next/link";

// Rendered when /events/[slug] can't find a published event. Admins may be
// looking at their own draft — send them straight to the editor.
export function EventDetailNotFoundClient({ slug }: { slug: string }) {
  const { isAdmin, isLoading } = useAuth();
  const t = useT();

  return (
    <PageShell>
      <div className="flex flex-col items-center gap-4 py-20">
        <h1 className="text-2xl font-bold">{t.events.notFound.title}</h1>
        <p className="text-muted-foreground">
          {t.events.notFound.description}
        </p>
        <div className="flex gap-3 mt-2">
          <Button asChild variant="secondary">
            <Link href="/events">{t.events.notFound.backToList}</Link>
          </Button>
          {isAdmin && !isLoading && (
            <Button asChild>
              <Link href={`/events/${slug}`}>{t.events.notFound.viewEvent}</Link>
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
