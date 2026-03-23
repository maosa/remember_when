/**
 * Audit logging — records sensitive platform operations to the audit_logs table.
 *
 * Only the service role (admin client) can insert audit logs; no user-facing
 * INSERT policy exists. Users can query their own logs via the SELECT policy.
 *
 * Audit entries are fire-and-forget: a logging failure must never block the
 * primary operation. All calls are best-effort (errors are swallowed).
 */

import { createAdminClient } from './supabase/admin'

export type AuditEvent =
  | 'account_deleted'
  | 'password_changed'
  | 'member_role_changed'
  | 'member_removed'
  | 'ownership_transferred'
  | 'invite_link_created'
  | 'invite_link_revoked'

/**
 * Writes an audit log entry.
 * Fire-and-forget — awaiting is optional; errors are silently swallowed.
 */
export async function logAuditEvent(
  userId: string,
  event: AuditEvent,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({ user_id: userId, event, metadata: metadata ?? null })
  } catch {
    // Non-fatal — never block the primary operation
  }
}
