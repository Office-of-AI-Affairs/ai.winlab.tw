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
