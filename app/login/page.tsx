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
    const result = await signIn(formData.get("email") as string, formData.get("password") as string);
    if (result.error) setError(result.error);
    setIsLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 md:py-16">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">登入</h1>
          <p className="text-muted-foreground mt-2">人工智慧專責辦公室管理後台</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">電子信箱</Label>
              <Input id="email" name="email" type="email" placeholder="your@email.com" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">密碼</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive text-center">錯誤的帳號或密碼</p>
            )}
            <Button type="submit" className="w-full mt-1" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "登入"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
