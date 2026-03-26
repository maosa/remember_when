import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : ''

const nextConfig: NextConfig = {
  // Vercel's edge network applies Brotli compression to all responses, so
  // there is no benefit to Next.js also gzip-compressing on the Node.js
  // server — it just wastes CPU on the function side.
  compress: false,

  // Allow next/image to optimise images hosted in Supabase Storage.
  // The Supabase host is read from the public env var at build time so
  // the pattern matches the correct project URL in every environment.
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/**' }]
      : [],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent embedding in iframes — blocks clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing — blocks content-type confusion attacks
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Limit referrer info sent to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict access to sensitive device APIs
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Enforce HTTPS for 2 years and preload
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Content Security Policy
          // Note: 'unsafe-inline' and 'unsafe-eval' are required by Next.js App Router
          // for its runtime scripts. Tighten with a nonce-based CSP when upgrading.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' https://${supabaseHost} blob: data:`,
              `media-src 'self' https://${supabaseHost} blob:`,
              `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
              "font-src 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
