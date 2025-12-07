import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
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
