import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@winlab/db", "@winlab/domain"],
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
};

export default nextConfig;
