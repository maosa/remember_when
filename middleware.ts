import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Protected route prefixes ─────────────────────────────────────────────────
// Any pathname that starts with one of these requires an authenticated session.
// Route group names ((app), (auth), etc.) are not part of the URL, so these
// match the actual request paths.

const PROTECTED_PREFIXES = [
  '/home',
  '/moments',
  '/friends',
  '/account',
  '/notifications',
] as const

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

// ─── Middleware ────────────────────────────────────────────────────────────────
//
// Runs on the Edge Runtime before every matched request.
// Primary responsibilities:
//   1. Refresh the Supabase auth token and propagate new cookies — without this,
//      sessions silently expire because Server Components cannot reliably write
//      cookies (the try/catch in lib/supabase/server.ts is the evidence).
//   2. Redirect unauthenticated users away from protected routes.

export async function middleware(request: NextRequest) {
  // supabaseResponse must be returned (not NextResponse.next()) so that
  // any refreshed auth cookies set by the Supabase client are forwarded to
  // the browser.  Re-assign inside setAll when a token refresh occurs.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens back onto the request so downstream
          // Server Components see them, then rebuild supabaseResponse so the
          // new cookies are included in the response sent to the browser.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not insert any logic between createServerClient and getUser().
  // Doing so can make session bugs very hard to diagnose.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated visitors away from protected routes
  if (!user && isProtected(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // IMPORTANT: return supabaseResponse — never a plain NextResponse.next() —
  // so that refreshed auth cookies are always forwarded to the browser.
  return supabaseResponse
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Run on every request except Next.js internals, static assets, and common
// image/icon formats so those continue to be served without an auth round-trip.

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
