import type { NextConfig } from 'next';

/**
 * Development-only Next.js config
 * No basePath, no standalone output - just simple local dev
 */
const nextConfig: NextConfig = {
  images: {
    domains: ['localhost', 'act.place'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Strict mode for catching issues early
  reactStrictMode: true,
  // Faster builds in dev
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
