import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [] },
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }, { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-store' }] }]
  },
}
export default phase => ({ ...nextConfig, distDir: phase === PHASE_DEVELOPMENT_SERVER ? (process.env.CYNDY_REDESIGN_PREVIEW === 'true' ? '.next-redesign' : process.env.CYNDY_STAGING_PREVIEW === 'true' ? '.next-staging' : '.next-dev') : '.next' })
