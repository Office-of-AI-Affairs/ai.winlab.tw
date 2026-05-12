import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <PageShell>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-7xl font-bold tracking-wider text-muted-foreground">
          404
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">找不到這個頁面</h1>
          <p className="text-muted-foreground">
            可能已被移除、尚未發布，或網址有誤。
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Button asChild variant="secondary">
            <AppLink href="/">
              <ArrowLeft className="w-4 h-4" />
              返回首頁
            </AppLink>
          </Button>
          <Button asChild>
            <AppLink href="/events">瀏覽活動</AppLink>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
