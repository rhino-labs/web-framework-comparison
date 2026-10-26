import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@bench/content', '@bench/react-ui'],
}

export default config
