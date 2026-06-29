'use client'

// Root error boundary. Next.js renders this only when an error is thrown in the
// root layout/template, replacing the whole page (it must render its own
// <html>/<body>). We forward the error to Sentry before showing a fallback.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <h2>Something went wrong.</h2>
      </body>
    </html>
  )
}
