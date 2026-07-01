import Link from 'next/link'
import { Lock } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'

/**
 * Shown when a signed-in user opens a moment they're not a member of.
 * Deliberately renders NO moment data (name/date/location/cover/posts) — the
 * server never sends any of it in the forbidden case, so nothing can leak.
 */
export function MomentNoAccess() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-rw-surface-raised text-rw-text-muted">
        <Lock className="size-5" />
      </div>
      <h1 className="text-lg font-semibold text-rw-text-primary">You don&apos;t have access to this moment</h1>
      <p className="text-sm text-rw-text-muted max-w-sm">
        This moment is private. Ask the person who shared it to invite you as a viewer or editor.
      </p>
      <Link href="/home" className={buttonVariants({ variant: 'default' })}>
        Go to home
      </Link>
    </main>
  )
}
