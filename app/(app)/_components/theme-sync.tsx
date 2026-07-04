'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { DEFAULT_THEME } from '@/lib/themes'

// useLayoutEffect on the client (applies before paint, so no flash during a
// client-side navigation), useEffect on the server to avoid the SSR warning.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Keeps <html data-theme> in sync with the signed-in user's palette in every
 * situation:
 *
 *  - **Full page load:** a pre-paint <script> is injected during SSR via
 *    useServerInsertedHTML, so the palette is set before first paint (no flash).
 *    Injecting via this hook (rather than rendering a <script> element) means it
 *    is emitted only on the server and never re-rendered on the client, so it
 *    doesn't trip React's "script tag inside a component" warning.
 *  - **Client-side navigation & theme changes:** React never executes inserted
 *    <script> tags on the client, so a layout effect (re-)applies the palette on
 *    mount (i.e. whenever the app route group is entered) and whenever the theme
 *    changes, and clears it on unmount (leaving the app group → public pages).
 *    This keeps "inside the app = themed, outside = default" for every nav kind.
 */
export function ThemeSync({ theme }: { theme: string }) {
  const injected = useRef(false)
  useServerInsertedHTML(() => {
    // Emit once per SSR render, and only for a non-default palette.
    if (injected.current || theme === DEFAULT_THEME) return null
    injected.current = true
    return (
      <script
        // theme is a validated slug (isThemeSlug in the layout), safe to inline.
        dangerouslySetInnerHTML={{ __html: `document.documentElement.dataset.theme=${JSON.stringify(theme)}` }}
      />
    )
  })

  useIsomorphicLayoutEffect(() => {
    const el = document.documentElement
    if (theme === DEFAULT_THEME) el.removeAttribute('data-theme')
    else el.dataset.theme = theme
    return () => {
      el.removeAttribute('data-theme')
    }
  }, [theme])

  return null
}
