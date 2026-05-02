import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF first, WebP fallback, then the original. Shaves the LCP
    // hero on mobile by ~30 % versus WebP-only at the same visual quality.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn.winlab.tw",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/team/:id", destination: "/", permanent: true },
      { source: "/recruitment", destination: "/events", permanent: true },
      { source: "/recruitment/:id", destination: "/events", permanent: true },
      { source: "/organization", destination: "/introduction", permanent: true },
      // /privacy/edit, /introduction/edit collapsed back into their read
      // routes with ?mode=edit driving the inline editor; the dedicated
      // edit subroutes were removed.
      { source: "/privacy/edit", destination: "/privacy?mode=edit", permanent: true },
      { source: "/introduction/edit", destination: "/introduction?mode=edit", permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
