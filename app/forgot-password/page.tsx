"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

type Step = "email" | "code" | "success";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
const RESEND_COOLDOWN_SECONDS = 60;
// Matches the GoTrue `GOTRUE_MAILER_OTP_LENGTH` setting for this project.
const OTP_LENGTH = 8;

function friendlyAuthError(err: { status?: number; code?: string; message?: string } | null | undefined): string {
  if (!err) return "發送失敗，請稍後再試。";
  // Supabase throttles same-email sends; surface cooldown hint instead of a generic error.
  if (err.status === 429 || err.code === "over_email_send_rate_limit" || /rate limit/i.test(err.message ?? "")) {
    return "寄送太頻繁，請稍後再試。";
  }
  return "發送失敗，請稍後再試。";
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function sendCode(targetEmail: string) {
    const supabase = createClient();
    // No redirectTo — recovery email is pure OTP (template uses {{ .Token }}),
    // so URL scanners (Defender Safe Links etc.) can't consume the token
    // before the real user opens the mail.
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail);
    return error;
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const value = (formData.get("email") as string).trim();

    const err = await sendCode(value);
    if (err) {
      setError(friendlyAuthError(err));
    } else {
      setEmail(value);
      setCode("");
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
    setIsLoading(false);
  }

  async function handleResend() {
    if (!email || cooldown > 0 || isLoading) return;
    setError(null);
    setResent(false);
    setIsLoading(true);
    const err = await sendCode(email);
    if (err) {
      setError(friendlyAuthError(err));
    } else {
      setResent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
    setIsLoading(false);
  }

  async function handleCodeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (code.length !== OTP_LENGTH) {
      setError(`請輸入 ${OTP_LENGTH} 位數驗證碼。`);
      return;
    }

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

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });
    if (verifyError) {
      setError("驗證碼錯誤或已過期，請重新輸入或申請新的驗證碼。");
      setIsLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("密碼更新失敗，請重新申請驗證碼。");
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setStep("success");
    setIsLoading(false);
  }

  return (
    <PageShell tone="auth">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">忘記密碼</h1>
          <p className="text-muted-foreground mt-2">
            {step === "email" && "輸入電子信箱，我們會寄送驗證碼"}
            {step === "code" && `輸入信中的 ${OTP_LENGTH} 位數驗證碼與新密碼`}
            {step === "success" && "密碼已更新"}
          </p>
        </div>

        <Card className="p-8">
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">電子信箱</Label>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="your@email.com" required />
              </div>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full mt-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "發送驗證碼"}
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

          {step === "code" && (
            <form onSubmit={handleCodeSubmit} className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                驗證碼已寄至 <span className="font-medium text-foreground">{email}</span>
              </p>
              <div className="flex flex-col gap-2 items-center">
                <Label htmlFor="code" className="self-start">驗證碼</Label>
                <InputOTP
                  id="code"
                  maxLength={OTP_LENGTH}
                  value={code}
                  onChange={(v) => setCode(v)}
                  pattern={REGEXP_ONLY_DIGITS}
                  autoComplete="one-time-code"
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }, (_, i) => (
                      <InputOTPSlot key={i} index={i} className="h-11 w-10 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
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
              {resent && !error && (
                <p role="status" className="text-sm font-medium text-muted-foreground text-center">已重新寄出驗證碼</p>
              )}
              <Button type="submit" className="w-full mt-1" disabled={isLoading || code.length !== OTP_LENGTH}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "更新密碼"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                    setResent(false);
                    setCode("");
                  }}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  換個信箱
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading || cooldown > 0}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `${cooldown} 秒後可重寄` : "沒收到？重寄驗證碼"}
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
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
        </Card>
      </div>
    </PageShell>
  );
}
