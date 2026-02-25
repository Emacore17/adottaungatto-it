import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@adottaungatto/ui', '@adottaungatto/config', '@adottaungatto/types'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'minio',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'minio',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
