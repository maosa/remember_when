'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function MomentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [isRetrying, startTransition] = useTransition()

  useEffect(() => {
    console.error(error)
  }, [error])

  // reset() alone only re-renders the error boundary; it does not refetch the
  // server component's data. router.refresh() refetches the server components
  // first so retrying can actually recover from data-fetch errors.
  function handleRetry() {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold">Could not load this moment</h2>
      <p className="text-sm text-rw-text-muted max-w-sm">
        There was a problem loading this moment. Please try again.
      </p>
      <Button onClick={handleRetry} disabled={isRetrying}>
        {isRetrying ? 'Retrying…' : 'Try again'}
      </Button>
    </div>
  )
}
