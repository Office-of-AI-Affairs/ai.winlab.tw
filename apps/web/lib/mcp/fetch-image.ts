// SSRF-safe image download for the upload_image MCP tool. Pure: no
// database, so the tests can import it.

const FETCH_TIMEOUT_MS = 10_000;

// upload_image accepts a public URL — make sure it's actually public-internet,
// not pointing at our own infra or cloud metadata endpoints (SSRF).
function assertPublicHttpUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`unsupported scheme: ${parsed.protocol}`);
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal" ||
    host.endsWith(".internal")
  ) {
    throw new Error(`refusing to fetch from internal host: ${host}`);
  }
  // crude IPv4 / IPv6 private range check — DNS rebinding still defeats this
  // (the resolved A record can flip between check and fetch), but the obvious
  // 169.254.169.254 / 10.x / 192.168.x / 127.x cases get caught.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map((n) => Number.parseInt(n, 10));
    if (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    ) {
      throw new Error(`refusing to fetch from private IP: ${host}`);
    }
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    throw new Error(`refusing to fetch from private IPv6: ${host}`);
  }
}

export const MAX_REDIRECTS = 5;

// Fetch following redirects MANUALLY, re-validating every hop against the SSRF
// allowlist. The default `fetch` auto-follows redirects without re-checking the
// target, so an attacker-controlled public URL could 302 us to 169.254.169.254
// or an internal host. `redirect: "manual"` lets us inspect each Location.
export async function fetchPublicImage(initialUrl: string): Promise<Response> {
  let url = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    assertPublicHttpUrl(url);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      url = new URL(location, url).toString();
      continue;
    }
    return response;
  }
  throw new Error("too many redirects");
}

// Read the body with a hard byte cap, aborting mid-stream once exceeded. A
// server can omit/understate content-length and stream gigabytes; buffering the
// whole response before checking size would OOM us, so cap as we read.
export async function readBodyCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error("image exceeds size limit");
    return buf;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("image exceeds size limit");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

