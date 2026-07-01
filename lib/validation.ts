/**
 * Shared input-validation helpers used on both the client and the server.
 *
 * Keeping the canonical rules here means the client-side hints and the
 * authoritative server-side checks can never drift apart.
 */

/**
 * Basic email shape check: one `@`, a non-empty local part, and a dotted domain.
 * Matches the pattern used in the signup and invite forms so client hints and
 * server enforcement stay identical. This is a shape check, not a deliverability
 * guarantee — Supabase Auth performs the authoritative validation on send.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}
