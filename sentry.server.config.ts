// Sentry initialisation for the Node.js server runtime.
// Loaded from instrumentation.ts via `register()`.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 'production' | 'preview' | 'development'. VERCEL_ENV is set automatically
  // on Vercel; falls back to 'development' for local runs. Lets you filter
  // production from preview noise in the Sentry UI.
  environment: process.env.VERCEL_ENV ?? 'development',

  // Capture 100% of transactions for tracing. Lower this in production once
  // traffic grows to stay within the free-tier quota (e.g. 0.1 = 10%).
  tracesSampleRate: 1,

  // Forward console.* and structured logs to Sentry.
  enableLogs: true,

  // Set to true temporarily if events are not arriving and you need to debug.
  debug: false,
})
