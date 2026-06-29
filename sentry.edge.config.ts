// Sentry initialisation for the Edge runtime (proxy.ts + any edge routes).
// Loaded from instrumentation.ts via `register()`.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // See sentry.server.config.ts for the rationale.
  environment: process.env.VERCEL_ENV ?? 'development',

  tracesSampleRate: 1,

  enableLogs: true,

  debug: false,
})
