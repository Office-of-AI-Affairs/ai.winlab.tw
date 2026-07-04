import type { NextConfig } from "next";

// Conservative CSP, not a strict nonce-based policy: this app has no
// middleware/proxy, so wiring per-request nonces without breaking Next's
// hydration bootstrap on the /oauth/authorize login form is a separate,
// tracked follow-up. This app serves no rich text and no third-party
// scripts/images/fonts (next/font self-hosts Noto Sans at build time), so
// the policy stays at 'self' everywhere; the CORS-open discovery/mcp
// endpoints are unaffected since CSP only governs browser-rendered pages.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@winlab/db", "@winlab/domain"],
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
