import type { NextConfig } from 'next'

/**
 * The registry is committed JSON, so the whole site is static: no server, no runtime
 * fetch, deployable to any object store or CDN.
 */
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
}

export default config
