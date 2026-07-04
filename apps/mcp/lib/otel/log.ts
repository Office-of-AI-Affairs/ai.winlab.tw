import { type LogAttributes, SeverityNumber, logs } from "@opentelemetry/api-logs";

const SEVERITY_NUMBERS: Record<"WARN" | "ERROR", SeverityNumber> = {
  WARN: SeverityNumber.WARN,
  ERROR: SeverityNumber.ERROR,
};

/**
 * Emit an OTel log record through whatever LoggerProvider `instrumentation.ts`
 * registered.
 *
 * Safe to call from any server-side path regardless of whether OTel was
 * actually wired up: when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset (e.g. plain
 * `bun run dev`), `register()` in instrumentation.ts never runs, so
 * `@opentelemetry/api-logs` stays on its built-in no-op LoggerProvider —
 * `logger.emit()` is then a harmless no-op, never a throw.
 *
 * Used both for the generic `onRequestError` bridge (severity ERROR) and
 * for the explicit rate-limit/auth-failure signals in oauth/callback
 * (severity WARN) — callers are responsible for keeping `attributes` free
 * of secrets (passwords, tokens, session data).
 */
export function emitOtelLog(input: {
  severity: "WARN" | "ERROR";
  message: string;
  attributes?: LogAttributes;
}): void {
  const logger = logs.getLogger("mcp");
  logger.emit({
    severityNumber: SEVERITY_NUMBERS[input.severity],
    severityText: input.severity,
    body: input.message,
    attributes: input.attributes,
  });
}
