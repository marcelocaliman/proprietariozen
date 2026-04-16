import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.proprietariozen.com.br' }],
        destination: 'https://proprietariozen.com.br/:path*',
        permanent: true,
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { hostname: 'images.unsplash.com' },
    ],
  },
  compress: true,
}

export default nextConfig
