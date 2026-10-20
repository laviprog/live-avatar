import type { NextConfig } from 'next';

const basePath = (process.env.BASE_PATH ?? '').trim().replace(/^\/*/, '/').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  basePath,
  output: 'standalone',
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
