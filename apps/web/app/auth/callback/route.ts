import { NextResponse } from "next/server";

// Resolve the user-supplied `next` against our own origin and keep only the
// path/query/hash. Anything that resolves to a different origin (//evil.com,
// @evil.com, https://evil.com, /\evil.com, …) is rejected back to "/", so this
// route can never be used as an open redirect that smuggles the OAuth code to
// an attacker domain.
export function safeNextPath(rawNext: string, origin: string): string {
  try {
    const resolved = new URL(rawNext, origin);
    if (resolved.origin !== origin) return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}

// Pass-through: Supabase redirects here after verifying the email token.
// We forward to the target page so the browser-side Supabase client
// (which holds the PKCE code_verifier) can complete the exchange.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next") ?? "/", origin);
  const error = searchParams.get("error");

  const target = new URL(next, origin);
  if (error) {
    target.searchParams.set("error", error);
  } else if (code) {
    target.searchParams.set("code", code);
  } else {
    target.searchParams.set("error", "invalid");
  }

  return NextResponse.redirect(target);
}
