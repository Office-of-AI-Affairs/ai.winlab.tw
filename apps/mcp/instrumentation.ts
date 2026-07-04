import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";
import { getClientAttributionAttributes } from "@/lib/otel/attribution";
import { emitOtelLog } from "@/lib/otel/log";

/**
 * OpenTelemetry bootstrap — producer for the Sensorium observability
 * platform (sensorium.zyx.tw). Sends request-span traces (4xx/5xx included)
 * plus explicit application log records over OTLP so agents (kilo/noir) can
 * query them via Sensorium's MCP.
 *
 * This mirrors apps/web/instrumentation.ts (see that file's comments for
 * the full protocol-risk writeup); the short version:
 *
 * - Sensorium's ingest only accepts OTLP/JSON — protobuf gets a 415.
 *   `@vercel/otel`'s own `OTLPHttpJsonTraceExporter` is used directly
 *   (rather than relying on `OTEL_EXPORTER_OTLP_PROTOCOL` being spelled
 *   correctly) so JSON is a code-level guarantee for traces.
 * - `spanProcessors: []` is required: @vercel/otel's default `["auto"]`
 *   *also* stands up its own env-driven exporter (defaulting to protobuf)
 *   whenever `OTEL_EXPORTER_OTLP_ENDPOINT` is set, independently of
 *   `traceExporter` — that's a duplicate-export trap, verified empirically
 *   on apps/web against a local sink (two POSTs to /v1/traces without this
 *   override). `[]` suppresses the auto processor.
 * - Logs use the same "explicit, no auto-drain" shape for a different
 *   reason: @vercel/otel has no "auto" resolution for `logRecordProcessors`
 *   (verified by reading its compiled source — it only stands up a
 *   `LoggerProvider` when `logRecordProcessors` is passed), so there's no
 *   double-export risk there. The pipeline is still explicit — a
 *   `BatchLogRecordProcessor` wrapping `@opentelemetry/exporter-logs-otlp-http`'s
 *   `OTLPLogExporter` — because that package's Node implementation hardcodes
 *   `JsonLogsSerializer` + `Content-Type: application/json` (verified by
 *   reading its compiled source), making JSON a code-level guarantee there
 *   too. Passing it via `logRecordProcessors` shares the same env-detected
 *   `resource` (service.namespace/service.name) between traces and logs.
 *
 * Everything here is env-driven; no endpoint/token is hardcoded.
 */
export function register() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // No collector configured (e.g. plain `bun run dev` locally) — skip
  // registering the SDK entirely. No throw, no background export attempts
  // against a phantom collector.
  if (!endpoint) return;

  const trimmedEndpoint = endpoint.replace(/\/+$/, "");
  const headers = parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

  registerOTel({
    // OTEL_RESOURCE_ATTRIBUTES (service.namespace / service.name) is read
    // automatically by @vercel/otel's default env resource detector; this
    // is just the fallback if that env var is absent.
    serviceName: process.env.OTEL_SERVICE_NAME ?? "mcp",
    spanProcessors: [],
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: `${trimmedEndpoint}/v1/traces`,
      headers,
    }),
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${trimmedEndpoint}/v1/logs`,
          headers,
        }),
      }),
    ],
  });
}

/**
 * Next.js's server-side error-observability hook: fires whenever an error
 * occurs on the server (Route Handlers, Server Actions, render). This app
 * is almost entirely Route Handlers (OAuth flow, MCP transport), so this
 * hook is the general-purpose backstop that catches unhandled exceptions
 * beyond the explicit rate-limit/auth-failure signals in
 * oauth/callback/route.ts.
 *
 * Reserved export name — Next.js calls this automatically if present, no
 * wiring needed beyond exporting it. No-op (via `emitOtelLog`'s built-in
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

  emitOtelLog({
    severity: "ERROR",
    message,
    attributes: {
      "http.route": request.path,
      "http.request.method": request.method,
      "next.router_kind": context.routerKind,
      "next.route_type": context.routeType,
      ...getClientAttributionAttributes(request.headers),
    },
  });
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
