// Next.js server instrumentation entry point.
// `register` runs once per server instance; we lazy-load the runtime-specific
// Sentry config so the Node SDK is not bundled into the Edge runtime and vice
// versa. `onRequestError` forwards server-side request errors to Sentry.
// Docs: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
