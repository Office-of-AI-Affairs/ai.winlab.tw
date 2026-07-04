import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Lock the image optimizer to OUR Supabase project rather than any *.supabase.co
// host, so it can't be used as an open image proxy for arbitrary projects.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseImageHost = supabaseUrl ? new URL(supabaseUrl).hostname : "*.supabase.co";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "https://*.supabase.co";

// Conservative CSP, not a strict nonce-based policy: this app has no
// middleware/proxy, so wiring per-request nonces into every inline script
// without breaking Next's hydration bootstrap is a separate, tracked
// follow-up. This is defense-in-depth on top of the server-side rich-text
// sanitizer (lib/ui/rich-text-sanitize.ts), which is the primary defense
// against stored XSS in article content.
//   - script-src/style-src need 'unsafe-inline' because there's no nonce
//   - connect-src/img-src cover the Supabase project the browser talks to
//     directly (auth, storage upload/download) — see lib/supabase/client.ts
//   - style-src/font-src allow Google Fonts (app/layout.tsx loads Noto Sans TC
//     as a <link> tag, not next/font, because it needs the CJK glyphs)
//   - frame-src only allows YouTube embeds (lib/ui/rich-text-sanitize.ts only
//     lets YouTube iframes survive sanitization in the first place)
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  `connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com ${supabaseOrigin}`,
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
  transpilePackages: ["@winlab/db", "@winlab/domain"],
  images: {
    // Serve AVIF first, WebP fallback, then the original. Shaves the LCP
    // hero on mobile by ~30 % versus WebP-only at the same visual quality.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseImageHost,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn.winlab.tw",
        pathname: "/announcement-images/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
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
