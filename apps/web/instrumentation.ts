import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";

/**
 * OpenTelemetry bootstrap — first producer for the Sensorium observability
 * platform (sensorium.zyx.tw). Sends request-span traces (4xx/5xx included)
 * over OTLP so agents (kilo/noir) can query them via Sensorium's MCP.
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
 */
export function register() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // No collector configured (e.g. plain `bun run dev` locally) — skip
  // registering the SDK entirely. No throw, no background export attempts
  // against a phantom collector.
  if (!endpoint) return;

  registerOTel({
    // OTEL_RESOURCE_ATTRIBUTES (service.namespace / service.name) is read
    // automatically by @vercel/otel's default env resource detector; this
    // is just the fallback if that env var is absent.
    serviceName: process.env.OTEL_SERVICE_NAME ?? "web",
    spanProcessors: [],
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: `${endpoint.replace(/\/+$/, "")}/v1/traces`,
      headers: parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    }),
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
