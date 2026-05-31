import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* No standalone output - use standard build for deployment compatibility */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
