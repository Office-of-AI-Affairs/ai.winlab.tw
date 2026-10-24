import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

// Old Supabase mail links pointed here. Password resets now use a mailed
// code, so every such link continues on /forgot-password.
export async function GET(request: Request) {
  const origin = process.env.NODE_ENV === "development" ? new URL(request.url).origin : SITE_URL;
  return NextResponse.redirect(new URL("/forgot-password", origin));
}
