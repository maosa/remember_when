// Client-side Sentry initialisation. In Next.js 15.3+ this file replaces the
// old `sentry.client.config.ts`; it runs after the document loads but before
// React hydration, so it captures early errors.
// Docs: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Browser builds can only read NEXT_PUBLIC_* vars; Vercel exposes
  // NEXT_PUBLIC_VERCEL_ENV automatically as the client-side counterpart of
  // VERCEL_ENV. Falls back to 'development' locally.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',

  tracesSampleRate: 1,

  // Session Replay. Records 10% of normal sessions and 100% of sessions where
  // an error occurs. Replay relies on a blob web worker — see worker-src in the
  // CSP in next.config.ts. Drop the replayIntegration entry to disable.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  debug: false,
})

// Captures App Router client-side navigation transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
