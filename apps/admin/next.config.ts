import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@adottaungatto/ui', '@adottaungatto/config', '@adottaungatto/types'],
};

export default nextConfig;
