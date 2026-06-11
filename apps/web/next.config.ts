import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Lock the image optimizer to OUR Supabase project rather than any *.supabase.co
// host, so it can't be used as an open image proxy for arbitrary projects.
const supabaseImageHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

// Conservative, non-breaking baseline (no full CSP — this app is cookieless /
// middleware-free, so a script-src policy would need nonce wiring first; that's
// a tracked follow-up). frame-ancestors + X-Frame-Options block clickjacking.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
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
