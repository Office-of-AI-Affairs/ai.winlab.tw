import type { NextConfig } from "next";

// Conservative, non-breaking security baseline. frame-ancestors + X-Frame-Options
// block clickjacking of the OAuth authorize/consent pages; nosniff + a tight
// Referrer-Policy round it out. No script-src CSP here — it would need nonce
// wiring and the CORS-open discovery/mcp endpoints must keep working.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@winlab/db", "@winlab/domain"],
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
