"use client";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/locale-provider";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData.get("email") as string, formData.get("password") as string);
    if (result.error) setError(result.error);
    setIsLoading(false);
  }

  return (
    <PageShell tone="auth">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t.auth.login.title}</h1>
          <p className="text-muted-foreground mt-2">{t.auth.login.subtitle}</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t.common.email}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="your@email.com" required />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.auth.forgotPasswordLink}
                </Link>
              </div>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive text-center">{t.auth.login.invalidCredentials}</p>
            )}
            <Button type="submit" className="w-full mt-1" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.auth.login.submit}
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
