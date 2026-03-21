import { createAdminClient } from './supabase/admin'

// These must exactly match the live notification_type enum values.
export type NotificationType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'moment_invite'
  | 'moment_invite_accepted'
  | 'moment_invite_declined'
  | 'moment_invite_response'
  | 'new_post'
  | 'member_left'
  | 'ownership_transferred'
  | 'ownership_transferred_away'
  | 'role_changed'
  | 'moment_deleted'
  | 'reminder'

// Types that are always delivered regardless of archived-moment suppression —
// these are direct responses to the recipient's own actions.
const BYPASS_ARCHIVE_SUPPRESSION = new Set<NotificationType>([
  'moment_invite_accepted',
  'moment_invite_declined',
])

// Maps each notification type to the column in notification_preferences that gates it.
const TYPE_TO_PREF_COLUMN: Partial<Record<NotificationType, string>> = {
  friend_request_received:     'friend_request_received',
  friend_request_accepted:     'friend_request_accepted',
  moment_invite:               'moment_invite',
  moment_invite_accepted:      'moment_invite_response',
  moment_invite_declined:      'moment_invite_response',
  moment_invite_response:      'moment_invite_response',
  new_post:                    'new_post',
  member_left:                 'member_left',
  ownership_transferred:       'ownership_transferred',
  ownership_transferred_away:  'ownership_transferred',
  role_changed:                'ownership_transferred',
  // moment_deleted has no preference toggle — always delivered
}

export interface NotificationPayload {
  user_id: string
  type: NotificationType
  /** The user who triggered the notification. Maps to notifications.related_user_id */
  related_user_id?: string
  /** The moment this notification relates to. Maps to notifications.related_moment_id */
  related_moment_id?: string
  post_id?: string
  /** Role value carried by role_changed / moment_invite notifications */
  invite_role?: 'editor' | 'reader'
  /** Arbitrary metadata (e.g. moment_name after the moment is deleted) */
  metadata?: Record<string, unknown>
}

/**
 * Insert one or more notifications, respecting each recipient's
 * notification_preferences and archived-moment suppression rules.
 *
 * Rules applied per recipient:
 * 1. If the relevant preference toggle is false, skip.
 * 2. If the notification relates to a moment the recipient has archived
 *    AND their archived_moment_notifications preference is false (the default), skip.
 */
export async function sendNotifications(payloads: NotificationPayload[]): Promise<void> {
  if (payloads.length === 0) return

  const admin = createAdminClient()
  const userIds = [...new Set(payloads.map((p) => p.user_id))]

  // Batch-fetch all relevant preferences.
  const { data: allPrefs } = await admin
    .from('notification_preferences')
    .select('*')
    .in('user_id', userIds)

  const prefsMap = new Map((allPrefs ?? []).map((p) => [p.user_id, p]))

  // Collect moment IDs to check for archived-moment suppression.
  const momentIds = [
    ...new Set(payloads.filter((p) => p.related_moment_id).map((p) => p.related_moment_id!)),
  ]
  const archivedPairs = new Set<string>() // "userId:momentId"

  if (momentIds.length > 0) {
    // Only check users who suppress archived-moment notifications
    // (missing prefs row = default false = suppress).
    const usersToCheck = userIds.filter((uid) => {
      const prefs = prefsMap.get(uid)
      return !prefs || !prefs.archived_moment_notifications
    })

    if (usersToCheck.length > 0) {
      const { data: archives } = await admin
        .from('moment_archive')
        .select('user_id, moment_id')
        .in('user_id', usersToCheck)
        .in('moment_id', momentIds)

      for (const a of archives ?? []) {
        archivedPairs.add(`${a.user_id}:${a.moment_id}`)
      }
    }
  }

  const toInsert = payloads.filter((p) => {
    const prefs = prefsMap.get(p.user_id)
    const col = TYPE_TO_PREF_COLUMN[p.type]

    // Check the per-type toggle (only if user has a prefs row; default is enabled).
    if (col && prefs && (prefs as Record<string, unknown>)[col] === false) return false

    // Suppress if the moment is archived and the user hasn't opted in to those notifications.
    // Some types bypass this (direct responses to the recipient's own actions).
    if (
      p.related_moment_id &&
      !BYPASS_ARCHIVE_SUPPRESSION.has(p.type) &&
      archivedPairs.has(`${p.user_id}:${p.related_moment_id}`)
    ) return false

    return true
  })

  if (toInsert.length > 0) {
    await admin.from('notifications').insert(
      toInsert.map((p) => ({
        user_id: p.user_id,
        type: p.type,
        related_user_id: p.related_user_id,
        related_moment_id: p.related_moment_id,
        post_id: p.post_id,
        ...(p.invite_role !== undefined && { invite_role: p.invite_role }),
        ...(p.metadata !== undefined && { metadata: p.metadata }),
      }))
    )
  }
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await sendNotifications([payload])
}
