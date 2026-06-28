import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/check-availability?username=xxx
 * GET /api/check-availability?email=xxx
 *
 * Server-side availability checks using the admin client (bypasses RLS).
 * Returns { available: boolean }
 *
 * Rate limited per-IP to blunt bulk username/email enumeration. (The underlying
 * check_*_available RPCs are anon-callable by design for the sign-up form.)
 */
export async function GET(request: NextRequest) {
  try {
    // Per-IP rate limit: 20 checks/minute is ample for a sign-up form, but
    // throttles automated enumeration. Note: in-memory store resets per
    // serverless instance — back with Upstash/Redis for strict cross-instance limits.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const { allowed } = checkRateLimit(`availability:${ip}`, {
      limit: 20,
      windowMs: 60 * 1000,
    })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const email = searchParams.get('email')

    const admin = createAdminClient()

    if (username) {
      const { data, error } = await admin
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()

      if (error) return NextResponse.json({ available: true })
      return NextResponse.json({ available: !data })
    }

    if (email) {
      // Use the SECURITY DEFINER DB function instead of loading all auth users.
      // Avoids loading up to 1000 rows and eliminates the email enumeration vector.
      const { data, error } = await admin.rpc('check_email_available', { p_email: email })
      if (error) return NextResponse.json({ available: true })
      return NextResponse.json({ available: data })
    }

    return NextResponse.json({ error: 'Provide username or email param' }, { status: 400 })
  } catch {
    // Fail open — don't block the user if the check errors
    return NextResponse.json({ available: true })
  }
}
