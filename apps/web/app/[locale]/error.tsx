"use client";

// Page-level error boundary. Next.js hands us any uncaught render or data
// fetch error thrown inside a segment. We log it (so Vercel keeps a trail)
// and show a friendly retry instead of the raw stack.
//
// This is a Client Component (error boundaries run in the browser), so it
// has no access to the server-side OTel logger. Errors that originate
// server-side (the common case — SSR/RSC render, data fetching) are already
// reported to Sensorium as OTel log records via `onRequestError` in
// ../instrumentation.ts, independent of this console.error.

import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <PageShell>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <AlertTriangle className="size-14 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{t.errors.title}</h1>
          <p className="text-muted-foreground max-w-md">{t.errors.body}</p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {t.errors.code}：{error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-2">
          <Button onClick={reset} variant="default">
            <RotateCw className="w-4 h-4" />
            {t.errors.retry}
          </Button>
          <Button asChild variant="secondary">
            <AppLink href="/">
              <Home className="w-4 h-4" />
              {t.errors.home}
            </AppLink>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
