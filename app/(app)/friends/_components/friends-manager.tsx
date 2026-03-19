'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { UserRound, UserRoundCheck, UserRoundX, Search, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  markNotificationsRead,
  type UserResult,
} from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Friend = {
  id: string
  first_name: string
  last_name: string
  username: string
  profile_photo_url: string | null
}

type FriendEntry = {
  friendshipId: string
  friend: Friend
}

type PendingEntry = {
  friendshipId: string
  from: Friend
}

type NotificationEntry = {
  id: string
  type: 'friend_request' | 'friend_request_accepted'
  createdAt: string
  fromUser: Friend
}

interface Props {
  friends: FriendEntry[]
  pendingReceived: PendingEntry[]
  notifications: NotificationEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(u: { first_name: string; last_name: string }) {
  return `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase()
}

function UserAvatar({ user, size = 'md' }: { user: Friend; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'size-8' : 'size-10'
  return (
    <Avatar className={sz}>
      <AvatarImage src={user.profile_photo_url ?? undefined} alt={user.username} />
      <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
    </Avatar>
  )
}

function UserRow({ user }: { user: Friend }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <UserAvatar user={user} />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FriendsManager({ friends, pendingReceived, notifications }: Props) {
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  // Dismiss notifications on mount if any are present
  useEffect(() => {
    if (notifications.length > 0) {
      markNotificationsRead()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAction(fn: () => Promise<{ error?: string } | void>) {
    setActionError(null)
    startTransition(async () => {
      const result = await fn()
      if (result && 'error' in result && result.error) {
        setActionError(result.error)
      }
    })
  }

  return (
    <div className="space-y-8">
      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      {/* ── Notifications ─────────────────────────────────────── */}
      {notifications.length > 0 && (
        <NotificationsSection notifications={notifications} />
      )}

      {/* ── Pending requests ──────────────────────────────────── */}
      {pendingReceived.length > 0 && (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Friend requests
              <span className="ml-2 inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {pendingReceived.length}
              </span>
            </h2>
            <ul className="space-y-3">
              {pendingReceived.map(({ friendshipId, from }) => (
                <li key={friendshipId} className="flex items-center justify-between gap-3">
                  <UserRow user={from} />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleAction(() => acceptFriendRequest(friendshipId))}
                    >
                      <UserRoundCheck className="size-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleAction(() => declineFriendRequest(friendshipId))}
                    >
                      <UserRoundX className="size-3.5" />
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <Separator />
        </>
      )}

      {/* ── Find friends (search) ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Find friends</h2>
        <UserSearch />
      </section>

      {/* ── Your friends ──────────────────────────────────────── */}
      {friends.length > 0 && (
        <>
          <Separator />
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Your friends ({friends.length})
            </h2>
            <ul className="space-y-3">
              {friends.map(({ friendshipId, friend }) => (
                <li key={friendshipId} className="flex items-center justify-between gap-3">
                  <UserRow user={friend} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground shrink-0"
                    disabled={isPending}
                    onClick={() => handleAction(() => removeFriend(friendshipId))}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {friends.length === 0 && pendingReceived.length === 0 && notifications.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <UserRound className="size-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Search above to find and add friends.</p>
        </div>
      )}
    </div>
  )
}

// ─── Notifications banner ─────────────────────────────────────────────────────

function NotificationsSection({ notifications }: { notifications: NotificationEntry[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">New</h2>
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <UserAvatar user={n.fromUser} size="sm" />
            <p className="text-sm">
              <span className="font-medium">
                {n.fromUser.first_name} {n.fromUser.last_name}
              </span>{' '}
              {n.type === 'friend_request'
                ? 'sent you a friend request.'
                : 'accepted your friend request.'}
            </p>
          </li>
        ))}
      </ul>
      <Separator />
    </section>
  )
}

// ─── Search ───────────────────────────────────────────────────────────────────

function UserSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actionStates, setActionStates] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(null)
      setSearchError(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      const res = await searchUsers(trimmed)
      setSearching(false)
      if (res.error) {
        setSearchError(res.error)
      } else {
        setResults(res.users ?? [])
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function handleSendRequest(userId: string) {
    setActionStates((s) => ({ ...s, [userId]: 'sending' }))
    const res = await sendFriendRequest(userId)
    if (res.error) {
      setActionStates((s) => ({ ...s, [userId]: 'error' }))
    } else {
      setActionStates((s) => ({ ...s, [userId]: 'sent' }))
      // Update local result to reflect new state
      setResults((prev) =>
        prev
          ? prev.map((u) =>
              u.id === userId ? { ...u, relationship: 'pending_sent' } : u
            )
          : prev
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search by name or username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-8"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults(null) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {searching && (
        <p className="text-sm text-muted-foreground">Searching…</p>
      )}

      {searchError && (
        <p className="text-sm text-destructive">{searchError}</p>
      )}

      {results !== null && !searching && (
        results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <ul className="space-y-3">
            {results.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3">
                <UserRow user={u} />
                <SearchResultAction
                  user={u}
                  actionState={actionStates[u.id]}
                  onSend={() => handleSendRequest(u.id)}
                />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

function SearchResultAction({
  user,
  actionState,
  onSend,
}: {
  user: UserResult
  actionState?: 'sending' | 'sent' | 'error'
  onSend: () => void
}) {
  const relationship = user.relationship

  if (relationship === 'accepted') {
    return <span className="text-xs text-muted-foreground shrink-0">Friends</span>
  }

  if (relationship === 'pending_received') {
    return <span className="text-xs text-muted-foreground shrink-0">Sent you a request</span>
  }

  if (relationship === 'pending_sent' || actionState === 'sent') {
    return <span className="text-xs text-muted-foreground shrink-0">Request sent</span>
  }

  if (actionState === 'error') {
    return <span className="text-xs text-destructive shrink-0">Error — try again</span>
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={actionState === 'sending'}
      onClick={onSend}
      className="shrink-0"
    >
      <UserRound className="size-3.5" />
      {actionState === 'sending' ? 'Sending…' : 'Add'}
    </Button>
  )
}
