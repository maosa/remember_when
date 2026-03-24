import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// CSRF protection note (Point 8):
// Next.js App Router server actions have built-in CSRF protection:
//   - The framework validates the Origin header on cross-origin requests.
//   - Auth cookies are set with SameSite=Lax by @supabase/ssr (see cookiesToSet options below),
//     which prevents them being sent in cross-site top-level navigations initiated by third parties.
//   - State-changing operations are POST-only server actions, not plain GET routes.
// No additional CSRF middleware is required.

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove this
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth') ||
    pathname === '/pricing' ||
    pathname === '/' // landing page — publicly accessible

  // Helper: redirect while preserving any Supabase cookie updates
  function redirectTo(destination: string): NextResponse {
    const url = request.nextUrl.clone()
    url.pathname = destination
    const res = NextResponse.redirect(url)
    // Copy refreshed session cookies so the next request is authenticated
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie)
    })
    return res
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && !isAuthRoute) {
    return redirectTo('/login')
  }

  // Redirect authenticated users away from auth pages (not the landing page —
  // '/' is publicly accessible and authenticated users may visit it freely)
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return redirectTo('/home')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
