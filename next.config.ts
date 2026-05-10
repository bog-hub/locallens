// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tell Next.js not to process sw.js through webpack/turbopack
  // It should be served as a static file from /public
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',  value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;