import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: [],
  },
  images: {
    domains: ["localhost"],
  },
};

export default nextConfig;
