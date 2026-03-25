'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserResult = {
  id: string
  first_name: string
  last_name: string
  username: string
  profile_photo_url: string | null
  /** Relationship from the current user's perspective, if any */
  relationship: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined'
  friendship_id: string | null
}

// ─── Search users ─────────────────────────────────────────────────────────────

export async function searchUsers(query: string): Promise<{ users?: UserResult[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const q = query.trim()
  if (q.length < 2) return { users: [] }

  // Fetch matching users (excluding self)
  const { data: found, error: searchError } = await supabase
    .from('users')
    .select('id, first_name, last_name, username, profile_photo_url')
    .neq('id', user.id)
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(20)

  if (searchError) return { error: searchError.message }
  if (!found || found.length === 0) return { users: [] }

  // Fetch active friendships involving the current user to annotate results
  const ids = found.map((u) => u.id)
  const { data: friendships } = await supabase
    .from('friendships')
    .select('id, requester_id, recipient_id, status')
    .is('deleted_at', null)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .in('requester_id', [user.id, ...ids])

  const friendshipMap = new Map<string, { id: string; status: string; requester_id: string }>()
  for (const f of friendships ?? []) {
    const other = f.requester_id === user.id ? f.recipient_id : f.requester_id
    if (ids.includes(other)) {
      friendshipMap.set(other, { id: f.id, status: f.status, requester_id: f.requester_id })
    }
  }

  const users: UserResult[] = found.map((u) => {
    const f = friendshipMap.get(u.id)
    let relationship: UserResult['relationship'] = 'none'
    let friendship_id: string | null = null

    if (f) {
      friendship_id = f.id
      if (f.status === 'accepted') {
        relationship = 'accepted'
      } else if (f.status === 'declined') {
        relationship = 'declined'
      } else if (f.requester_id === user.id) {
        relationship = 'pending_sent'
      } else {
        relationship = 'pending_received'
      }
    }

    return { ...u, relationship, friendship_id }
  })

  return { users }
}

// ─── Send friend request ──────────────────────────────────────────────────────

export async function sendFriendRequest(recipientId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check for a pre-existing row between these two users (either direction).
  // Two simple queries are more reliable than a nested or(and()) PostgREST expression.
  const { data: dir1 } = await supabase
    .from('friendships')
    .select('id, status, deleted_at')
    .eq('requester_id', user.id)
    .eq('recipient_id', recipientId)
    .maybeSingle()

  const { data: dir2 } = dir1
    ? { data: null }
    : await supabase
        .from('friendships')
        .select('id, status, deleted_at')
        .eq('requester_id', recipientId)
        .eq('recipient_id', user.id)
        .maybeSingle()

  const existing = dir1 ?? dir2

  if (existing) {
    const isResendable = existing.deleted_at !== null || existing.status === 'declined'
    if (!isResendable) return { error: 'A friendship or pending request already exists.' }

    const { error: updateError } = await supabase
      .from('friendships')
      .update({ requester_id: user.id, recipient_id: recipientId, status: 'pending', deleted_at: null })
      .eq('id', existing.id)

    if (updateError) return { error: updateError.message }
  } else {
    const { error: insertError } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, recipient_id: recipientId, status: 'pending' })

    if (insertError) return { error: insertError.message }
  }

  // Notify the recipient
  await sendNotification({
    user_id: recipientId,
    type: 'friend_request_received',
    related_user_id: user.id,
  })

  revalidatePath('/friends')
  return {}
}

// ─── Accept friend request ────────────────────────────────────────────────────

export async function acceptFriendRequest(friendshipId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: friendship, error: updateError } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('recipient_id', user.id)   // only the recipient can accept
    .eq('status', 'pending')
    .select('requester_id')
    .single()

  if (updateError || !friendship) return { error: updateError?.message ?? 'Request not found.' }

  // Notify the original requester
  await sendNotification({
    user_id: friendship.requester_id,
    type: 'friend_request_accepted',
    related_user_id: user.id,
  })

  // Mark the incoming friend_request_received notification as read
  const admin = createAdminClient()
  await admin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('type', 'friend_request_received')
    .eq('related_user_id', friendship.requester_id)
    .eq('read', false)

  revalidatePath('/friends')
  return {}
}

// ─── Decline friend request ───────────────────────────────────────────────────

export async function declineFriendRequest(friendshipId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', friendshipId)
    .eq('recipient_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  // Mark the incoming friend_request_received notification as read.
  // Need requester_id to identify the right notification.
  const admin = createAdminClient()
  const { data: fr } = await admin
    .from('friendships')
    .select('requester_id')
    .eq('id', friendshipId)
    .single()

  if (fr) {
    await admin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('type', 'friend_request_received')
      .eq('related_user_id', fr.requester_id)
      .eq('read', false)
  }

  revalidatePath('/friends')
  return {}
}

// ─── Remove friend (soft delete) ─────────────────────────────────────────────

export async function removeFriend(friendshipId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('friendships')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq('status', 'accepted')

  if (error) return { error: error.message }

  revalidatePath('/friends')
  return {}
}

// ─── Mark notifications read ──────────────────────────────────────────────────

export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  revalidatePath('/friends')
  revalidatePath('/', 'layout')
}
