import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";
import { getClientAttributionAttributes } from "@/lib/otel/attribution";
import { emitErrorLog, flushLogs, setLogFlusher } from "@/lib/otel/log";

/**
 * OpenTelemetry bootstrap — producer for the Sensorium observability
 * platform (sensorium.zyx.tw). Sends request-span traces (4xx/5xx included)
 * plus explicit application log records (server-side render errors) over
 * OTLP so agents (kilo/noir) can query them via Sensorium's MCP.
 *
 * Everything here is env-driven; no endpoint/token is hardcoded. See the
 * env table in the PR description for the full contract.
 *
 * Protocol note: Sensorium's ingest only accepts OTLP/JSON — protobuf gets
 * a 415. `@vercel/otel`'s *default* trace exporter does honor the standard
 * `OTEL_EXPORTER_OTLP_PROTOCOL` env var (verified by reading
 * @vercel/otel@2.1.3's compiled dist/node/index.js: it switches between its
 * own `OTLPHttpJsonTraceExporter` and `OTLPHttpProtoTraceExporter` based on
 * that value, defaulting to protobuf if unset/unrecognized). Rather than
 * depend on that env value being spelled exactly right in a manually
 * configured Vercel project, we import `OTLPHttpJsonTraceExporter`
 * directly and use it unconditionally — JSON is a code-level guarantee,
 * not something a typo in `OTEL_EXPORTER_OTLP_PROTOCOL` could silently
 * flip to protobuf. `@vercel/otel` ships this exporter itself, so this
 * needs no extra `@opentelemetry/exporter-trace-otlp-http` dependency.
 *
 * `spanProcessors: []` matters here: @vercel/otel's default `spanProcessors`
 * is `["auto"]`, and that "auto" resolution *also* stands up its own
 * env-driven exporter independently of whatever `traceExporter` is passed,
 * whenever `OTEL_EXPORTER_OTLP_ENDPOINT` is set — verified empirically by
 * pointing this app at a local HTTP sink: without this override we saw
 * TWO POSTs to `/v1/traces` per request, one `application/x-protobuf`
 * (the "auto" one, defaulting to protobuf) and one `application/json`
 * (ours). `spanProcessors: []` suppresses that auto processor so our
 * explicit JSON exporter is the *only* one registered — no duplicate
 * spans, no stray protobuf request hitting Sensorium's ingest.
 *
 * Logs follow the same "explicit, no auto-drain" shape, for a different
 * reason: `@vercel/otel@2.1.3` has no "auto" resolution for
 * `logRecordProcessors` (read the same compiled source — unlike
 * `spanProcessors`, it only ever stands up a `LoggerProvider` when you pass
 * `logRecordProcessors` yourself, so there's no double-export trap to guard
 * against here). We still build the pipeline explicitly — a
 * `BatchLogRecordProcessor` wrapping `@opentelemetry/exporter-logs-otlp-http`'s
 * `OTLPLogExporter` — because that package's Node implementation hardcodes
 * `JsonLogsSerializer` + `Content-Type: application/json` (verified by
 * reading its compiled source), so JSON is a code-level guarantee the same
 * way `OTLPHttpJsonTraceExporter` is for traces. Passing it via
 * `logRecordProcessors` lets @vercel/otel share the same env-detected
 * `resource` (service.namespace/service.name) between traces and logs.
 */
export function register() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // No collector configured (e.g. plain `bun run dev` locally) — skip
  // registering the SDK entirely. No throw, no background export attempts
  // against a phantom collector.
  if (!endpoint) return;

  const trimmedEndpoint = endpoint.replace(/\/+$/, "");
  const headers = parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

  // Built outside the `registerOTel` call so we keep our own reference to
  // it — `registerOTel` returns `void` and wraps whatever's in
  // `logRecordProcessors` into a `LoggerProvider` it never hands back, so
  // this is the only handle we'll have. See the long comment on
  // `flushLogs` in lib/otel/log.ts for why we need it: `forceFlush()` on
  // *this* processor is how logs actually make it out before a Vercel
  // function instance freezes.
  const logProcessor = new BatchLogRecordProcessor({
    exporter: new OTLPLogExporter({
      url: `${trimmedEndpoint}/v1/logs`,
      headers,
    }),
  });

  registerOTel({
    // OTEL_RESOURCE_ATTRIBUTES (service.namespace / service.name) is read
    // automatically by @vercel/otel's default env resource detector; this
    // is just the fallback if that env var is absent.
    serviceName: process.env.OTEL_SERVICE_NAME ?? "web",
    spanProcessors: [],
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: `${trimmedEndpoint}/v1/traces`,
      headers,
    }),
    logRecordProcessors: [logProcessor],
  });

  setLogFlusher(() => logProcessor.forceFlush());
}

/**
 * Next.js's server-side error-observability hook: fires whenever an error
 * occurs on the server (Server Component render, Route Handlers, Server
 * Actions) — including the same errors that then surface to
 * `app/error.tsx` / `app/global-error.tsx`. Those two files are Client
 * Components (`"use client"`, error boundaries run in the browser after
 * hydration), so they have no access to the server-side OTel logger
 * registered above; this hook is the actual bridge that gets those errors
 * into Sensorium as log records, independent of the boundary UI.
 *
 * Reserved export name — Next.js calls this automatically if present, no
 * wiring needed beyond exporting it. No-op (via `emitErrorLog`'s built-in
 * no-op fallback) when OTel was never registered.
 */
export async function onRequestError(
  error: unknown,
  request: Readonly<{
    path: string;
    method: string;
    headers: NodeJS.Dict<string | string[]>;
  }>,
  context: Readonly<{
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "proxy";
    renderSource?: "react-server-components" | "react-server-components-payload" | "server-rendering";
    revalidateReason: "on-demand" | "stale" | undefined;
  }>,
) {
  const message = error instanceof Error ? error.message : String(error);
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  emitErrorLog({
    message,
    digest,
    attributes: {
      "http.route": request.path,
      "http.request.method": request.method,
      "next.router_kind": context.routerKind,
      "next.route_type": context.routeType,
      ...getClientAttributionAttributes(request.headers),
    },
  });

  // Same freeze problem as app/api/beacon/route.ts (see flushLogs' doc
  // comment) — this error record would otherwise just as likely sit in the
  // batch processor's buffer forever on Vercel.
  //
  // Can't use `after()` here like the beacon route does: verified empirically
  // (throwing a route handler locally and inspecting the error) that
  // `after()` unconditionally throws "called outside a request scope" from
  // inside `onRequestError`. That's not a fluke of one route type — Next
  // runs the actual handler inside `workAsyncStorage.run(...)`, and that
  // scope is already torn down by the time it reaches the surrounding
  // catch block that calls this hook, for every routeType (`render` /
  // `route` / `action` / `proxy`). So this is a hard limitation, not a
  // sometimes-works one: awaiting the flush inline is the only way to get
  // a delivery guarantee here, at the cost of adding flush latency to
  // error responses (measured against a local OTLP sink: single-digit ms
  // once warm; unmeasured against the real network round-trip to
  // Sensorium, which will be higher — see PR description). Only the rare
  // 4xx/5xx path pays this cost; the beacon's `204` path (the hot path)
  // stays exactly as fast as before via `after()`.
  await flushLogs();
}

/**
 * Minimal parser for the OTLP `key1=value1,key2=value2` header env format
 * (e.g. `Authorization=Bearer <token>`). Doesn't percent-decode values —
 * fine for bearer tokens, which don't contain `,`/`=`.
 */
function parseOtlpHeaders(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;

  const headers: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (key) headers[key] = value;
  }
  return headers;
}
