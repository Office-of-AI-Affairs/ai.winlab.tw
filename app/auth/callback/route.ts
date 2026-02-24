import { NextResponse } from "next/server";

// Pass-through: Supabase redirects here after verifying the email token.
// We forward to the target page so the browser-side Supabase client
// (which holds the PKCE code_verifier) can complete the exchange.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}${next}?error=${error}`);
  }
  if (code) {
    return NextResponse.redirect(`${origin}${next}?code=${code}`);
  }
  return NextResponse.redirect(`${origin}${next}?error=invalid`);
}
