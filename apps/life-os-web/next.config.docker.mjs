// Simplified Next.js configuration for Docker builds
// Removes Nx dependencies for production container builds

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for optimized builds
  experimental: {
    outputFileTracingRoot: '/app',
  },
  
  // Output configuration for Docker
  output: 'standalone',
  
  // Disable telemetry in production
  telemetry: {
    disabled: true,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Disable development features
  reactStrictMode: true,
  
  // Australian localization
  i18n: {
    locales: ['en-AU', 'en'],
    defaultLocale: 'en-AU',
  },
  
  // Security headers for Beautiful Obsolescence compliance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-Beautiful-Obsolescence',
            value: '2027'
          },
          {
            key: 'X-Community-Control',
            value: 'enabled'
          },
          {
            key: 'X-Data-Residency',
            value: 'Australia'
          }
        ],
      },
    ]
  },
}

export default nextConfig;