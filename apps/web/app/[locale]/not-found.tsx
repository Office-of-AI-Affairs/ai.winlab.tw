"use client";

import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const t = useT();
  return (
    <PageShell>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-7xl font-bold tracking-wider text-muted-foreground">
          {t.notFound.code}
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{t.notFound.title}</h1>
          <p className="text-muted-foreground">{t.notFound.body}</p>
        </div>
        <div className="flex gap-3 mt-2">
          <Button asChild variant="secondary">
            <AppLink href="/">
              <ArrowLeft className="w-4 h-4" />
              {t.notFound.home}
            </AppLink>
          </Button>
          <Button asChild>
            <AppLink href="/events">{t.notFound.browseEvents}</AppLink>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
