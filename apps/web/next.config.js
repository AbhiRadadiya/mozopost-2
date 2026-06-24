/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow images from common CDNs / your own domain
  images: {
    domains: ['mozopost.in', 'seller.mozopost.in', 'cdn.mozopost.in'],
  },

  // In production each PM2 instance serves the same build
  // but with different NEXT_PUBLIC_APP_ROLE env vars injected.
  // We don't need separate builds — one build works for all three panels.
  output: 'standalone',

  // Allow the dev server to accept requests from all subdomains
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
