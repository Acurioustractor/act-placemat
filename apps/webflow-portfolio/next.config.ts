import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Configure for Webflow Cloud deployment with mount path /portfolio
  basePath: '/portfolio',
  assetPrefix: '/portfolio',

  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
