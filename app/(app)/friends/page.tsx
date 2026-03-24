import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FriendsManager } from './_components/friends-manager'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Accepted friends
  const { data: friendships } = await supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      recipient_id,
      requester:users!friendships_requester_id_fkey(id, first_name, last_name, username, profile_photo_url),
      recipient:users!friendships_recipient_id_fkey(id, first_name, last_name, username, profile_photo_url)
    `)
    .eq('status', 'accepted')
    .is('deleted_at', null)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)

  // Pending requests sent by the current user
  const { data: pendingSent } = await supabase
    .from('friendships')
    .select(`
      id,
      recipient:users!friendships_recipient_id_fkey(id, first_name, last_name, username, profile_photo_url)
    `)
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .is('deleted_at', null)

  // Pending requests received by the current user
  const { data: pendingReceived } = await supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      requester:users!friendships_requester_id_fkey(id, first_name, last_name, username, profile_photo_url)
    `)
    .eq('recipient_id', user.id)
    .eq('status', 'pending')
    .is('deleted_at', null)

  // Unread notifications for the current user
  const { data: notifications } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      created_at,
      from_user:users!notifications_from_user_id_fkey(id, first_name, last_name, username, profile_photo_url)
    `)
    .eq('user_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })

  // Normalise: each friend should be the "other" user
  const friends = (friendships ?? []).map((f) => {
    const isRequester = f.requester_id === user.id
    const friend = isRequester
      ? (f.recipient as unknown as Friend)
      : (f.requester as unknown as Friend)
    return { friendshipId: f.id, friend }
  })

  return (
    <main className="min-h-screen bg-rw-bg">
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12 space-y-10">
        <h1 className="text-2xl font-semibold">Friends</h1>
        <FriendsManager
          friends={friends}
          pendingSent={(pendingSent ?? []).map((r) => ({
            friendshipId: r.id,
            to: r.recipient as unknown as Friend,
          }))}
          pendingReceived={(pendingReceived ?? []).map((r) => ({
            friendshipId: r.id,
            from: r.requester as unknown as Friend,
          }))}
          notifications={(notifications ?? []).map((n) => ({
            id: n.id,
            type: n.type as 'friend_request' | 'friend_request_accepted',
            createdAt: n.created_at,
            fromUser: n.from_user as unknown as Friend,
          }))}
        />
      </div>
    </main>
  )
}

// Shared type (inlined here to avoid a separate types file)
type Friend = {
  id: string
  first_name: string
  last_name: string
  username: string
  profile_photo_url: string | null
}
