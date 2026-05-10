'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold">Could not load your moments</h2>
      <p className="text-sm text-rw-text-muted max-w-sm">
        There was a problem fetching your moments. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
