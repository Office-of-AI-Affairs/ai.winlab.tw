import { type LogAttributes, SeverityNumber, logs } from "@opentelemetry/api-logs";

/**
 * Emit an OTel log record through whatever LoggerProvider `instrumentation.ts`
 * registered.
 *
 * Safe to call from any server-side path regardless of whether OTel was
 * actually wired up: when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset (e.g. plain
 * `bun run dev`), `register()` in instrumentation.ts never runs, so
 * `@opentelemetry/api-logs` stays on its built-in no-op LoggerProvider —
 * `logger.emit()` is then a harmless no-op, never a throw.
 */
export function emitErrorLog(input: {
  message: string;
  digest?: string;
  attributes?: LogAttributes;
}): void {
  const logger = logs.getLogger("web");
  logger.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: "ERROR",
    body: input.message,
    attributes: {
      ...(input.digest ? { "error.digest": input.digest } : {}),
      ...input.attributes,
    },
  });
}

/**
 * Sibling of `emitErrorLog` for first-party client analytics (pageview /
 * web-vital beacons — see `app/api/beacon/route.ts`) rather than server
 * errors, so it gets its own severity (INFO, not ERROR) and no `digest`
 * field. Same no-op-when-unregistered guarantee as `emitErrorLog`.
 */
export function emitAnalyticsLog(input: { name: string; attributes?: LogAttributes }): void {
  const logger = logs.getLogger("web");
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: "INFO",
    body: input.name,
    attributes: input.attributes,
  });
}

// Handle to the real `BatchLogRecordProcessor` instance `instrumentation.ts`
// constructs, set via `setLogFlusher` at `register()` time.
//
// Why not just call `logs.getLoggerProvider().forceFlush()`? Because
// `@opentelemetry/api-logs`'s global getter returns a `ProxyLoggerProvider` —
// an API-level facade that only satisfies the `LoggerProvider` *interface*
// (`getLogger()`). `forceFlush`/`shutdown` are SDK-level concerns
// (`@opentelemetry/sdk-logs`'s concrete `LoggerProvider`/processors), not
// part of that facade, so there's nothing to call through it. Keeping our
// own reference to the actual processor sidesteps that entirely — calling
// `forceFlush()` directly on the processor we built drains its buffer to the
// exporter, which is the whole of what flushing the LoggerProvider would do
// anyway (a LoggerProvider's `forceFlush()` just delegates to its
// processor's).
let flushLogsImpl: (() => Promise<void>) | undefined;

/**
 * Registered once by `instrumentation.ts`'s `register()` with a closure over
 * the `BatchLogRecordProcessor` it created. Never call this from app code —
 * it exists purely so `instrumentation.ts` can hand `flushLogs()` something
 * to call without this module needing to import `@opentelemetry/sdk-logs`
 * itself.
 */
export function setLogFlusher(flush: () => Promise<void>): void {
  flushLogsImpl = flush;
}

/**
 * Force-drains any buffered log records to the OTLP exporter right now,
 * instead of waiting for `BatchLogRecordProcessor`'s own export schedule
 * (default: every 5s, or once its queue fills up).
 *
 * That schedule is the reason logs never made it to Sensorium in
 * production despite spans arriving fine: on Vercel, the function instance
 * freezes the instant the response is sent, so a batch processor's
 * scheduled export can simply never get a turn to run. `@vercel/otel`
 * flushes its *own* trace processors at invocation end, but a
 * `LoggerProvider` built from a plain `logRecordProcessors` array isn't
 * part of that lifecycle.
 *
 * Callers on Vercel MUST call this from inside `next/server`'s `after()`
 * (see `app/api/beacon/route.ts`) — `after()` is what keeps the function
 * instance alive long enough for the flush to complete, without delaying
 * the response itself.
 *
 * No-op when OTel was never registered (plain `bun run dev`, no
 * `OTEL_EXPORTER_OTLP_ENDPOINT`) — same guarantee as `emitErrorLog`/
 * `emitAnalyticsLog`.
 */
export async function flushLogs(): Promise<void> {
  if (!flushLogsImpl) return;
  await flushLogsImpl();
}
