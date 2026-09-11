import { NextResponse } from "next/server";
import { readDiagErrors } from "@/lib/diag/error-buffer";

// TEMPORARY diagnostic endpoint for #81 — see lib/diag/error-buffer.ts.
// Returns the server-side errors `onRequestError` saw in THIS function
// instance. Reports only the error itself (name, message, stack, route);
// no environment, no headers, no request bodies.
//
// The token below is a throwaway generated for this investigation, gates
// nothing but a stack trace, and is removed together with this file as soon
// as the root cause is identified.
export const dynamic = "force-dynamic";

const DIAG_TOKEN = "5efbbfda140bd8eee3d6be642eb6f351";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (token !== DIAG_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const errors = readDiagErrors();
  return NextResponse.json(
    { instanceSawErrors: errors.length, errors },
    { headers: { "cache-control": "no-store" } },
  );
}
