import { NextResponse } from "next/server";
import { captureDiagError, readDiagErrors, type CapturedError } from "@/lib/diag/error-buffer";

// TEMPORARY diagnostic endpoint for #81 — see lib/diag/error-buffer.ts.
//
// POST is the ingest side: `onRequestError` runs inside the *page*
// function, which on Vercel is a different Lambda from this route, so
// module scope alone can never bridge the two (verified: the buffer read
// back empty every time). The hook posts here instead, and GET reads the
// buffer back out of this route's own warm instance.
//
// Reports only the error itself (name, message, stack, route); no
// environment, no headers, no request bodies. The token is a throwaway
// generated for this investigation, gates nothing but a stack trace, and is
// removed together with this file.
export const dynamic = "force-dynamic";

const DIAG_TOKEN = "5efbbfda140bd8eee3d6be642eb6f351";

function authorized(request: Request): boolean {
  return new URL(request.url).searchParams.get("token") === DIAG_TOKEN;
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse("Not Found", { status: 404 });
  try {
    captureDiagError((await request.json()) as CapturedError);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  if (!authorized(request)) return new NextResponse("Not Found", { status: 404 });
  const errors = readDiagErrors();
  return NextResponse.json(
    { instanceSawErrors: errors.length, errors },
    { headers: { "cache-control": "no-store" } },
  );
}
