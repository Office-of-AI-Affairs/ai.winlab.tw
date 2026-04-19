"use client";

// Page-level error boundary. Next.js hands us any uncaught render or data
// fetch error thrown inside a segment. We log it (so Vercel keeps a trail)
// and show a friendly retry instead of the raw stack.

import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <PageShell>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <AlertTriangle className="size-14 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">發生錯誤</h1>
          <p className="text-muted-foreground max-w-md">
            頁面載入時出了點問題。重試一次看看；如果還是不行，或許可以先回首頁繼續瀏覽。
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono mt-1">
              錯誤代碼：{error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-2">
          <Button onClick={reset} variant="default">
            <RotateCw className="w-4 h-4" />
            重試
          </Button>
          <Button asChild variant="secondary">
            <AppLink href="/">
              <Home className="w-4 h-4" />
              返回首頁
            </AppLink>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
