import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      // Auth service routes
      {
        source: '/api/v1/auth/:path*',
        destination: 'http://localhost:3001/api/v1/auth/:path*',
      },
      // Catalog service routes
      {
        source: '/api/v1/catalog/:path*',
        destination: 'http://localhost:3002/api/v1/catalog/:path*',
      },
    ];
  },
};

export default nextConfig;
