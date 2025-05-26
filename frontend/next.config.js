/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// Only enable static exports in production
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  // Disable static exports for now to support dynamic routes
  output: undefined,
  // Set the base path for static exports
  basePath: isProd ? '' : '',
  // Disable image optimization for static exports
  images: {
    unoptimized: true,
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071/api',
  },
  // Optimize module imports
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
  },
  // Configure compiler for improved performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Optimize loading of SVG files
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig)
