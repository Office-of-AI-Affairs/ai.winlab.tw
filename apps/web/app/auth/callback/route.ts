import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

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
