import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import path from "node:path";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Conservative CSP, not a strict nonce-based policy: this app has no
// middleware/proxy, so wiring per-request nonces into every inline script
// without breaking Next's hydration bootstrap is a separate, tracked
// follow-up. This is defense-in-depth on top of the server-side rich-text
// sanitizer (lib/ui/rich-text-sanitize.ts), which is the primary defense
// against stored XSS in article content.
//   - script-src/style-src need 'unsafe-inline' because there's no nonce
//   - connect-src is this site only (plus Google Fonts); img-src allows any
//     https image because article content may embed external images
//   - style-src/font-src allow Google Fonts (app/layout.tsx loads Noto Sans TC
//     as a <link> tag, not next/font, because it needs the CJK glyphs)
//   - frame-src only allows YouTube embeds (lib/ui/rich-text-sanitize.ts only
//     lets YouTube iframes survive sanitization in the first place)
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
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
  // bun hoists this monorepo's node_modules to the repo root, but each Vercel
  // project builds with rootDirectory = apps/<name>. Without an explicit root,
  // Next infers a workspace root outside the repo (it warns about the stray
  // ~/package-lock.json) and output file tracing can drop hoisted native
  // assets — sharp's .node binary, resvg's wasm — from the traced functions,
  // 500-ing every route that imports `lib/seo/og-image` (#79).
  outputFileTracingRoot: path.resolve(process.cwd(), "..", ".."),
  // Self-hosted on Carrel: `node server.js` from .next/standalone.
  output: "standalone",
  transpilePackages: ["@winlab/db", "@winlab/domain"],
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  images: {
    // WebP only. On the 2-vCPU machine a cold AVIF encode takes 1 to 2.4 s
    // per image versus 0.16 s for WebP, and a page of cold images queues
    // behind it. AVIF saves about 15 KB per image, not worth the wait.
    formats: ["image/webp"],
    // Uploads are served from /files on this site. Rows written through MCP
    // may hold the absolute URL of the same files.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ai.winlab.tw",
        pathname: "/files/announcement-images/**",
      },
    ],
  },
  async headers() {
    return [
      // Everything except uploaded files gets the page policy.
      { source: "/((?!files/).*)", headers: securityHeaders },
      // Uploaded files are data, never a page: no script, no plugins, and
      // a sandbox in case a browser renders one as a document.
      {
        source: "/files/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // The MCP server used to live on its own host. Since the move to
      // Better Auth every MCP client signs in again against ai.winlab.tw/mcp,
      // so the old host simply points everything there.
      {
        source: "/:path*",
        has: [{ type: "host", value: "mcp.ai.winlab.tw" }],
        destination: "https://ai.winlab.tw/:path*",
        permanent: true,
      },
      { source: "/team/:id", destination: "/", permanent: true },
      { source: "/recruitment", destination: "/events", permanent: true },
      { source: "/recruitment/:id", destination: "/events", permanent: true },
      { source: "/organization", destination: "/introduction", permanent: true },
      // /privacy/edit, /introduction/edit, /announcement/[id]/edit, and
      // /events/[slug]/announcements/[id]/edit collapsed back into their
      // read routes with ?mode=edit driving the inline editor; the
      // dedicated edit subroutes were removed.
      { source: "/privacy/edit", destination: "/privacy?mode=edit", permanent: true },
      { source: "/introduction/edit", destination: "/introduction?mode=edit", permanent: true },
      { source: "/announcement/:id/edit", destination: "/announcement/:id?mode=edit", permanent: true },
      { source: "/events/:slug/edit", destination: "/events/:slug", permanent: true },
      { source: "/events/:slug/announcements/:id/edit", destination: "/events/:slug/announcements/:id?mode=edit", permanent: true },
      { source: "/events/:slug/results/:id/edit", destination: "/events/:slug/results/:id?mode=edit", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
