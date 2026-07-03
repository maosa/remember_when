'use server'

/**
 * Records a user's acceptance of the Terms of Service and Privacy Policy.
 *
 * Called from the signup flow immediately after the auth account (and its
 * public.users row, created by the handle_new_auth_user trigger) is created.
 * Writes go through the service-role/admin client — there is no user-facing
 * INSERT policy on legal_acceptances — mirroring the audit_logs pattern
 * (see lib/audit.ts).
 *
 * The version recorded is the server-side source of truth (lib/legal.ts), not
 * anything supplied by the client. Idempotent: if a row already exists for the
 * user at the current version of a document, it is not duplicated (safe to
 * retry).
 *
 * FUTURE WORK: invited users who complete their profile via
 * app/api/complete-profile do not yet flow through here — add an equivalent
 * acceptance step there if/when the invite completion screen gains the checkbox.
 */

import { createAdminClient } from './supabase/admin'
import { TERMS_VERSION, PRIVACY_VERSION } from './legal'

export async function recordSignupAcceptance(userId: string): Promise<void> {
  const admin = createAdminClient()

  const wanted = [
    { user_id: userId, document: 'terms' as const, version: TERMS_VERSION, method: 'signup' as const },
    { user_id: userId, document: 'privacy' as const, version: PRIVACY_VERSION, method: 'signup' as const },
  ]

  // Skip any (document, version) already recorded for this user so retries don't
  // create duplicate rows (there is no unique constraint — a user legitimately
  // accumulates one row per version accepted over time).
  const { data: existing } = await admin
    .from('legal_acceptances')
    .select('document, version')
    .eq('user_id', userId)

  const toInsert = wanted.filter(
    (row) => !existing?.some((e) => e.document === row.document && e.version === row.version),
  )

  if (toInsert.length > 0) {
    await admin.from('legal_acceptances').insert(toInsert)
  }
}
