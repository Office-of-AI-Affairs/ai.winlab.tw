"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";

type PageState = "waiting" | "ready" | "success" | "invalid";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [pageState, setPageState] = useState<PageState>("waiting");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasError = searchParams.get("error");
  const hasCode = searchParams.get("code");
  const isInvalidLink = Boolean(hasError || !hasCode);

  useEffect(() => {
    if (isInvalidLink) return;

    // The browser Supabase client (singleton, initialised by AuthProvider)
    // automatically exchanges the ?code= PKCE token and fires PASSWORD_RECOVERY.
    // We just listen for that event — do NOT call exchangeCodeForSession ourselves.
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      }
    });

    // Fallback: if the event was fired before our listener registered,
    // check whether a session already exists after a short delay.
    const fallback = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setPageState((prev) => prev === "waiting" ? "ready" : prev);
      } else {
        setPageState((prev) => prev === "waiting" ? "invalid" : prev);
      }
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [isInvalidLink]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("兩次輸入的密碼不一致。");
      return;
    }
    if (!passwordRegex.test(password)) {
      setError("密碼須至少 6 個字元，且包含大寫、小寫字母與特殊符號。");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("密碼更新失敗，請重新申請重設連結。");
      setIsLoading(false);
    } else {
      await supabase.auth.signOut();
      setPageState("success");
      setIsLoading(false);
    }
  }

  return (
    <Card className="p-8">
      {pageState === "waiting" && (
        <div role="status" className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">驗證中…</p>
        </div>
      )}

      {(isInvalidLink || pageState === "invalid") && (
        <div role="alert" className="flex flex-col items-center gap-4 py-4">
          <XCircle className="w-10 h-10 text-destructive" />
          <div className="text-center">
            <p className="font-medium">連結無效或已過期</p>
            <p className="text-sm text-muted-foreground mt-1">請重新申請密碼重設連結。</p>
          </div>
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
            重新申請
          </Link>
        </div>
      )}

      {pageState === "success" && (
        <div role="status" className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <div className="text-center">
            <p className="font-medium">密碼已更新</p>
            <p className="text-sm text-muted-foreground mt-1">請使用新密碼重新登入。</p>
          </div>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
            前往登入
          </Link>
        </div>
      )}

      {!isInvalidLink && pageState === "ready" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">新密碼</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="至少 6 字元，含大小寫與特殊符號" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">確認新密碼</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" placeholder="再次輸入新密碼" required />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive text-center">{error}</p>
          )}
          <Button type="submit" className="w-full mt-1" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "更新密碼"}
          </Button>
        </form>
      )}
    </Card>
  );
}

function ResetPasswordFallback() {
  return (
    <Card className="p-8">
      <div role="status" className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">載入中…</p>
      </div>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <PageShell tone="auth">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">重設密碼</h1>
          <p className="text-muted-foreground mt-2">設定您的新密碼</p>
        </div>

        <Suspense fallback={<ResetPasswordFallback />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
