import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { emitAnalyticsLog, emitErrorLog, flushLogs, setLogFlusher } from "@/lib/otel/log";

describe("emitErrorLog / emitAnalyticsLog", () => {
  test("never throw when OTel was never registered (no-op LoggerProvider)", () => {
    assert.doesNotThrow(() => emitErrorLog({ message: "boom" }));
    assert.doesNotThrow(() => emitAnalyticsLog({ name: "pageview" }));
  });
});

describe("flushLogs / setLogFlusher", () => {
  test("is a no-op when no flusher was ever registered", async () => {
    // Module-level state may already carry a flusher from an earlier test
    // in this file — this case is really only exercised by instrumentation
    // never having called setLogFlusher at all (e.g. no
    // OTEL_EXPORTER_OTLP_ENDPOINT). Assert only the contract that matters:
    // it never throws and never hangs.
    await assert.doesNotReject(flushLogs());
  });

  test("delegates to whatever flusher instrumentation.ts registered", async () => {
    let calls = 0;
    setLogFlusher(async () => {
      calls += 1;
    });

    await flushLogs();
    await flushLogs();

    assert.equal(calls, 2);
  });

  test("propagates a rejected flush instead of swallowing it", async () => {
    setLogFlusher(async () => {
      throw new Error("exporter unreachable");
    });

    await assert.rejects(flushLogs(), /exporter unreachable/);
  });
});
