import { after } from "next/server";
import { normalizeBeaconEvent } from "@/lib/analytics/schema";
import { emitAnalyticsLog, flushLogs } from "@/lib/otel/log";

/**
 * First-party, cookieless analytics beacon for public (ISR/static) pages —
 * see `components/analytics-beacon.tsx` for the client sender and
 * `lib/analytics/schema.ts` for payload validation. Every event becomes one
 * OTel log record through the same Sensorium pipeline `instrumentation.ts`
 * already wires up for server-side error logs (see `emitAnalyticsLog`).
 *
 * `runtime: "nodejs"` (not edge) so this route shares the
 * instrumentation-registered `LoggerProvider` — `@opentelemetry/api-logs`'s
 * global registry doesn't cross the edge/node runtime boundary.
 *
 * Contract with visitors: this endpoint never surfaces an error. Bad/oversize
 * payloads and cross-origin requests are silently dropped; the response is
 * always `204` so a broken/blocked beacon can never affect page behavior.
 *
 * `after()` (not an inline `await flushLogs()`) matters here: on Vercel, the
 * function instance freezes the moment the `204` response is sent, so
 * `BatchLogRecordProcessor`'s own export schedule may never get a turn —
 * `after()` is what keeps the instance alive long enough for the flush to
 * finish without adding that latency to the response itself. See
 * `flushLogs`'s doc comment in lib/otel/log.ts for the full story.
 */
export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024;

function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Cheap same-origin filter, not a security boundary (this endpoint has no
 * auth and drops on any validation failure anyway) — just enough to keep
 * random cross-origin pages from spamming events into Sensorium.
 * `sec-fetch-site` is sent by all modern browsers for both `fetch` and
 * `sendBeacon`; fall back to comparing `Origin` against `Host` for the rare
 * client that omits it.
 */
function isSameOrigin(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "same-origin" || secFetchSite === "none";

  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Coarse device bucket from User-Agent — no UA parser dependency, just
 *  enough signal to segment mobile vs. tablet vs. desktop in Sensorium. */
function coarseDeviceType(userAgent: string | null): string | undefined {
  if (!userAgent) return undefined;
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export async function POST(req: Request): Promise<Response> {
  if (!isSameOrigin(req)) return noContent();

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) return noContent();

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return noContent();
  }
  // Belt-and-suspenders: some clients omit Content-Length (chunked bodies).
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return noContent();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return noContent();
  }

  const event = normalizeBeaconEvent(parsed);
  if (!event) return noContent();

  const country = req.headers.get("x-vercel-ip-country") ?? undefined;
  const region = req.headers.get("x-vercel-ip-country-region") ?? undefined;
  const device = coarseDeviceType(req.headers.get("user-agent"));

  if (event.type === "pageview") {
    emitAnalyticsLog({
      name: "pageview",
      attributes: {
        "event.name": "pageview",
        "url.path": event.path,
        ...(event.referrerOrigin ? { "http.referrer_origin": event.referrerOrigin } : {}),
        ...(event.utmSource ? { "utm.source": event.utmSource } : {}),
        ...(event.utmMedium ? { "utm.medium": event.utmMedium } : {}),
        ...(event.utmCampaign ? { "utm.campaign": event.utmCampaign } : {}),
        ...(event.locale ? { "client.locale": event.locale } : {}),
        ...(event.viewport ? { "client.viewport": event.viewport } : {}),
        ...(device ? { "client.device": device } : {}),
        ...(country ? { "geo.country": country } : {}),
        ...(region ? { "geo.region": region } : {}),
      },
    });
  } else {
    emitAnalyticsLog({
      name: `webvital:${event.name}`,
      attributes: {
        "event.name": "webvital",
        "webvital.name": event.name,
        "webvital.value": event.value,
        ...(event.rating ? { "webvital.rating": event.rating } : {}),
        "url.path": event.path,
        ...(country ? { "geo.country": country } : {}),
        ...(region ? { "geo.region": region } : {}),
      },
    });
  }

  // Scheduled for after the response is sent — never adds latency to the
  // 204, but still runs while Vercel keeps the invocation alive.
  after(() => flushLogs());

  return noContent();
}
