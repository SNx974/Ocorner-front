/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // nécessaire pour Docker
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
}
module.exports = nextConfig
