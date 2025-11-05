import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Configure for Webflow Cloud deployment with mount path /portfolio
  basePath: '/portfolio',
  // Note: assetPrefix removed for OpenNext Cloudflare compatibility
  // OpenNext handles asset paths automatically with basePath

  // Enable standalone output for OpenNext Cloudflare
  output: 'standalone',

  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
