"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError("發送失敗，請稍後再試。");
    } else {
      setSent(true);
    }
    setIsLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 md:py-16">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">忘記密碼</h1>
          <p className="text-muted-foreground mt-2">輸入電子信箱以接收重設連結</p>
        </div>

        <Card className="p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Mail className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">已寄出重設連結</p>
                <p className="text-sm text-muted-foreground mt-1">請檢查您的電子信箱並點擊信中的連結以重設密碼。</p>
              </div>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
                返回登入
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">電子信箱</Label>
                <Input id="email" name="email" type="email" placeholder="your@email.com" required />
              </div>
              {error && (
                <p className="text-sm font-medium text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full mt-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "發送重設連結"}
              </Button>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回登入
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
