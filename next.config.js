/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-toast',
      '@radix-ui/react-select',
      '@tanstack/react-query',
    ],
  },
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    // Exclude supabase functions from webpack compilation
    config.module.rules.push({
      test: /supabase\/functions\/.*\.ts$/,
      use: 'ignore-loader',
    })
    return config
  },
  productionBrowserSourceMaps: false,
  // Removed deprecated/unsupported options in Next 15
  // Handle trailing slashes consistently
  trailingSlash: false,
  // Redirect configuration
  async redirects() {
    return [
      // Redirect root to dashboard for authenticated users
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'sb-access-token',
          },
        ],
      },
      // Redirect trailing slash routes to non-trailing slash
      {
        source: '/visitors/',
        destination: '/visitors',
        permanent: true,
      },
      {
        source: '/members/',
        destination: '/members',
        permanent: true,
      },
      {
        source: '/groups/',
        destination: '/groups',
        permanent: true,
      },
      {
        source: '/attendance/',
        destination: '/attendance',
        permanent: true,
      },
      {
        source: '/celebrations/',
        destination: '/celebrations',
        permanent: true,
      },
      {
        source: '/sms/',
        destination: '/sms',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig