import { trace } from "@opentelemetry/api";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientAttributionAttributes } from "@/lib/otel/attribution";

/**
 * Runs before every request. Its only job is client attribution: decorate
 * the active OTel span with the caller's IP + Vercel geo headers (see
 * lib/otel/attribution.ts for the attribute-key contract) so Sensorium can
 * answer "who (IP/country) hit which route, with what result" — attack-
 * source attribution on top of the request-span traces and error logs
 * instrumentation.ts already ships (see PR #25/#26).
 *
 * Named `proxy` (not `middleware`) and the file is `proxy.ts`: Next.js 16
 * renamed the convention, and — verified by reading the compiled
 * next@16.2.6 build source (build/index.js's `isProxyFile` check) — files
 * named `proxy.ts` always run as Node.js-runtime middleware, never the Edge
 * sandbox. That matters here: it's what lets `trace.getActiveSpan()` below
 * see the same OTel context/TracerProvider that `instrumentation.ts`
 * registered (an Edge-sandboxed `middleware.ts` runs in an isolated V8
 * context that does not share that registration).
 *
 * Known caveat, verified empirically against a local OTLP sink: the span
 * this decorates ("middleware GET ...") and the span carrying
 * `http.route`/`http.status_code` for the matched route ("GET /route",
 * `BaseServer.handleRequest`) do NOT share a traceId when self-hosted via
 * `next start` — Next.js starts a fresh root trace once it dispatches past
 * middleware. Both spans do land in the same OTLP export for the request,
 * just not joinable by traceId; Sensorium needs a different correlation key
 * (e.g. timestamp + IP) for route+ip+status joins on the happy path. The
 * `onRequestError` log below doesn't have this problem — it carries
 * `client.address`/`geo.*` and `http.route` in one record.
 */
export function proxy(request: NextRequest) {
  trace.getActiveSpan()?.setAttributes(getClientAttributionAttributes(request.headers));
  return NextResponse.next();
}

export const config = {
  // Next.js's recommended default: every request except static assets —
  // those never hit an API route or get logged, so attributing them adds
  // per-request overhead with no observability payoff.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
