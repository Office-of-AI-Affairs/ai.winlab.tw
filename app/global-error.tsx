"use client";

// Root-level error boundary. This one fires when the root layout itself
// throws, which means we're rendering without our usual <html> / <body>
// wrapper — Next.js requires this file to ship its own document shell.
// Keep it tiny, no Tailwind imports (globals.css may not be loaded),
// no shadcn components (AuthProvider may not be mounted).

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="zh-TW">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#111",
          background: "#fafafa",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            嚴重錯誤
          </h1>
          <p style={{ color: "#666", margin: "0 0 1.25rem" }}>
            整個頁面無法正常載入。重試後若仍然失敗，請稍候再回來。
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#888",
                margin: "0 0 1.25rem",
              }}
            >
              錯誤代碼：{error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              borderRadius: "999px",
              cursor: "pointer",
            }}
          >
            重試
          </button>
        </div>
      </body>
    </html>
  );
}
