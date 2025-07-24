/** @type {import('next').NextConfig} */
// Temporarily disable PWA to fix service worker issues with static export
// const withPWA = require('next-pwa')({ dest: 'public' });

const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  transpilePackages: ['@carpool/shared'],

  // Simple build configuration for Azure Static Web Apps
  swcMinify: true,
  poweredByHeader: false,

  // Use static export for Azure Static Web Apps
  output: 'export',
  trailingSlash: true,
  distDir: 'out',

  // Image optimization disabled for better compatibility
  images: {
    unoptimized: true,
  },

  // Build-time optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Environment variables
  env: {
    BUILD_TIME: new Date().toISOString(),
    // API Configuration based on environment
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://carpool-api.azurewebsites.net/api'
        : 'http://localhost:7071/api'),
    NEXT_PUBLIC_ENV: process.env.NODE_ENV,

    // Authentication configuration - explicitly include these
    NEXT_PUBLIC_ENABLE_LEGACY_AUTH:
      process.env.NEXT_PUBLIC_ENABLE_LEGACY_AUTH || 'true',
    NEXT_PUBLIC_ENABLE_ENTRA_AUTH:
      process.env.NEXT_PUBLIC_ENABLE_ENTRA_AUTH || 'true',
    NEXT_PUBLIC_BASE_URL:
      process.env.NEXT_PUBLIC_BASE_URL || 'https://carpool.vedprakash.net',
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'https://carpool.vedprakash.net/api',
    NEXT_PUBLIC_ENTRA_CLIENT_ID:
      process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID ||
      'c5118183-d391-4a86-ad73-29162678a5f0',
    NEXT_PUBLIC_ENTRA_AUTHORITY:
      process.env.NEXT_PUBLIC_ENTRA_AUTHORITY ||
      'https://login.microsoftonline.com/vedprakashmoutlook.onmicrosoft.com',
  },

  experimental: {
    scrollRestoration: true,
  },
};

// Export without PWA wrapper for now
module.exports = nextConfig;
