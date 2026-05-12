"use client";

import { AuthShell } from "@/components/auth-shell";
import { useState } from "react";

type AuthorizeFormProps = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource?: string;
  state?: string;
};

export function AuthorizeForm({
  clientId,
  redirectUri,
  codeChallenge,
  resource,
  state,
}: AuthorizeFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/oauth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          clientId,
          redirectUri,
          codeChallenge,
          resource,
          state,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error_description || data.error || "登入失敗");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("網路連線失敗，請稍後再試");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="AI WINLAB MCP"
      title="登入"
      description="AI WinLab MCP 授權頁面"
    >
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-[2rem] border border-border p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm leading-none font-medium select-none" htmlFor="email">
              電子信箱
            </label>
            <input
              className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="your@email.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm leading-none font-medium select-none" htmlFor="password">
              密碼
            </label>
            <input
              className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive text-center">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="interactive-scale inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full mt-1 disabled:pointer-events-none disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "登入中..." : "登入並授權"}
          </button>
        </form>
        <div className="text-sm text-muted-foreground flex flex-col gap-2">
          <p className="break-all">Client: {clientId}</p>
          <p className="break-all">Redirect URI: {redirectUri}</p>
        </div>
      </div>
    </AuthShell>
  );
}
