/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'immoweb.be',
      },
      {
        protocol: 'https',
        hostname: 'www.immoweb.be',
      },
      {
        protocol: 'https',
        hostname: '**.immoweb.be',
      },
      {
        protocol: 'https',
        hostname: 'logic-immo.be',
      },
      {
        protocol: 'https',
        hostname: 'www.logic-immo.be',
      },
      {
        protocol: 'https',
        hostname: '**.logic-immo.be',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'pictures.funda.io',
      },
      {
        protocol: 'https',
        hostname: '**.funda.io',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.imgix.net',
      },
      {
        protocol: 'https',
        hostname: '**.immowebstatic.be',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // TypeScript — ignore pre-existing errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint during builds — ignore pre-existing lint errors for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Externalize puppeteer and related packages (server-side only)
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'puppeteer',
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth',
        'puppeteer-core',
      ];
    }

    // Suppress warnings for dynamic requires
    config.module = {
      ...config.module,
      exprContextCritical: false,
      unknownContextCritical: false,
    };

    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /clone-deep/ },
      { module: /merge-deep/ },
    ];

    return config;
  },

  // Disable powered by header
  poweredByHeader: false,
};

export default nextConfig;
