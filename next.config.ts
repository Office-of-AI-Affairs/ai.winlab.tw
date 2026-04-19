import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  images: {
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
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
