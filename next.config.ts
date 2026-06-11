import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  compress: false, // Disable compression - causes crashes through Caddy proxy
  allowedDevOrigins: [
    '.space-z.ai',
    'localhost',
    '127.0.0.1',
  ],
};

export default nextConfig;
