/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.100'],
  logging: {
    browserToTerminal: true,
  },
  compress: true,
  staticPageGenerationTimeout: 120,
  cacheComponents: true,
  cacheLife: {
    foreverish: {
      stale: 60 * 60 * 24 * 30,
      revalidate: 60 * 60 * 24 * 365,
      expire: 60 * 60 * 24 * 365 * 2,
    },
  },
  reactCompiler: true,

  experimental: {
    appNewScrollHandler: true,
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      'framer-motion',
      'embla-carousel-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
    ],
  },

  // ── Keep heavy server-only libs out of the client bundle ─────────────────────
  serverExternalPackages: [
    'mongoose',
    'mongodb',
    'cloudinary',
    'exceljs',
    'jspdf',
    'jspdf-autotable',
    'resend',
  ],

  // ── Image Optimization ───────────────────────────────────────────────────────
  // Removed `unoptimized: true` — was bypassing ALL Next.js image optimization.
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
    // Mobile-first device sizes: phones (360-428px) → tablet (768px) → desktop
    deviceSizes: [360, 428, 640, 768, 1024, 1280, 1920],
    // For fill/fixed images — product cards, thumbnails
    imageSizes: [16, 32, 64, 96, 128, 180, 256, 384],
    // Cache optimized images for 30 days
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  poweredByHeader: false,

  // ── HTTP Caching & Security Headers ──────────────────────────────────────────
  async headers() {
    const securityHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://analytics.tiktok.com https://www.googletagmanager.com https://va.vercel-scripts.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' blob: data: https://res.cloudinary.com https://lh3.googleusercontent.com https://www.facebook.com https://*.facebook.com https://*.tiktok.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "connect-src 'self' wss://*.pusher.com https://*.pusher.com https://res.cloudinary.com https://*.facebook.com https://*.tiktok.com https://analytics.tiktok.com https://www.google-analytics.com https://api.resend.com https://*.vercel-insights.com https://*.on.aws https://*.a.run.app",
          "frame-src 'self' https://www.facebook.com https://www.google.com https://maps.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
        ].join('; '),
      },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.(png|jpg|jpeg|svg|webp|avif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
