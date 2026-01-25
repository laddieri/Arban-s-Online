/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
      // Add your custom domain if using one
      // {
      //   protocol: 'https',
      //   hostname: 'your-domain.com',
      // },
    ],
  },
}

module.exports = nextConfig
