import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  /* config options here */
  // Configure for deployment:
  // - Vercel: no basePath needed (standalone domain/subdomain)
  // - OpenNext/Cloudflare: use basePath for path-based routing
  basePath: isDev || isVercel ? '' : '/portfolio',

  // Enable standalone output only for OpenNext Cloudflare (not Vercel)
  output: isDev || isVercel ? undefined : 'standalone',

  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.webflowusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'share.descript.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
      },
    ],
  },

  // Vercel-specific optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
