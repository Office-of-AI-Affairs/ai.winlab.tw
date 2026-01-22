"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col justify-center items-center gap-8 mt-8">
      <h1 className="text-3xl font-bold w-full text-center">登入</h1>
      <Card className="w-full max-w-lg p-6 py-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-base shrink-0 w-12" htmlFor="email">
                帳號
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-base shrink-0 w-12" htmlFor="password">
                密碼
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            {error && (
              <p className="text-md font-bold text-destructive text-center">錯誤的帳號或密碼！</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full text-base" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "登入"}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-base">
              忘記密碼？
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
