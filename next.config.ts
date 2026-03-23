import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : ''

const nextConfig: NextConfig = {
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
