'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { DEFAULT_THEME, setThemeCookie } from '@/lib/themes'

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
 *    mount and whenever the theme changes.
 *
 * It also **seeds the `rw_theme` cookie** from the DB value (the source of
 * truth) on every authenticated load. That cookie is what the root layout's
 * pre-paint script reads to theme *all* pages — including static public ones —
 * so this write is how the cookie gets populated after any login method and
 * self-heals across devices. The theme is intentionally NOT cleared on unmount:
 * it must persist onto public pages (landing, Terms, Privacy) for signed-in and
 * returning signed-out users.
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
    // Mirror the DB value into the cookie so the root pre-paint script themes
    // public pages too (and other devices heal on their next app load).
    setThemeCookie(theme)
  }, [theme])

  return null
}
