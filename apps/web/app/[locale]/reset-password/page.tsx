"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";

type PageState = "waiting" | "ready" | "success" | "invalid";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;

function ResetPasswordForm() {
  const t = useT();
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
      setError(t.auth.password.mismatch);
      return;
    }
    if (!passwordRegex.test(password)) {
      setError(t.auth.password.requirements);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(t.auth.resetPassword.updateFailed);
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
          <p className="text-sm text-muted-foreground">{t.auth.resetPassword.verifying}</p>
        </div>
      )}

      {(isInvalidLink || pageState === "invalid") && (
        <div role="alert" className="flex flex-col items-center gap-4 py-4">
          <XCircle className="w-10 h-10 text-destructive" />
          <div className="text-center">
            <p className="font-medium">{t.auth.resetPassword.invalidLinkTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.auth.resetPassword.invalidLinkDescription}</p>
          </div>
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
            {t.auth.resetPassword.reapply}
          </Link>
        </div>
      )}

      {pageState === "success" && (
        <div role="status" className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <div className="text-center">
            <p className="font-medium">{t.auth.password.updated}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.auth.password.loginWithNew}</p>
          </div>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
            {t.auth.goToLogin}
          </Link>
        </div>
      )}

      {!isInvalidLink && pageState === "ready" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t.auth.newPasswordLabel}</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder={t.auth.newPasswordPlaceholder} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">{t.auth.confirmPasswordLabel}</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" placeholder={t.auth.confirmPasswordPlaceholder} required />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive text-center">{error}</p>
          )}
          <Button type="submit" className="w-full mt-1" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.auth.updatePassword}
          </Button>
        </form>
      )}
    </Card>
  );
}

function ResetPasswordFallback() {
  const t = useT();
  return (
    <Card className="p-8">
      <div role="status" className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t.auth.resetPassword.loading}</p>
      </div>
    </Card>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <PageShell tone="auth">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t.auth.resetPassword.title}</h1>
          <p className="text-muted-foreground mt-2">{t.auth.resetPassword.subtitle}</p>
        </div>

        <Suspense fallback={<ResetPasswordFallback />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
