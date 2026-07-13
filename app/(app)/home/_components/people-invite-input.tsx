'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, X, Search, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { searchUsersToInvite } from '../actions'

export type InviteeDisplay = {
  type: 'userId' | 'email'
  value: string
  role: 'editor' | 'reader'
  label: string
  photoUrl?: string | null
}

interface Props {
  invitees: InviteeDisplay[]
  onAdd: (item: InviteeDisplay) => void
  onRemove: (value: string) => void
  onRoleChange: (value: string, role: 'editor' | 'reader') => void
}

export function PeopleInviteInput({ invitees, onAdd, onRemove, onRoleChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; firstName: string; lastName: string; username: string; photoUrl: string | null }> | null>(null)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchIdRef = useRef(0)

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
  const excludeIds = invitees.filter((i) => i.type === 'userId').map((i) => i.value)
  // Kept in a ref so the debounced async search reads the latest exclusions
  // without re-running the effect. Updated post-commit (read only inside the timeout).
  const excludeIdsRef = useRef(excludeIds)
  useEffect(() => { excludeIdsRef.current = excludeIds })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced async search; clear results when the query is too short
      setResults(null)
      return
    }

    if (isEmail(q)) {
      setResults(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const id = ++searchIdRef.current
      setSearching(true)
      const res = await searchUsersToInvite(q, excludeIdsRef.current)
      if (searchIdRef.current !== id) return
      setSearching(false)
      setResults(res.users ?? [])
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const q = query.trim()
      if (isEmail(q)) {
        onAdd({ type: 'email', value: q, label: q, role: 'editor' })
        setQuery('')
        setResults(null)
      }
    }
  }

  function selectUser(u: { id: string; firstName: string; lastName: string; username: string; photoUrl: string | null }) {
    onAdd({ type: 'userId', value: u.id, label: `${u.firstName} ${u.lastName}`, photoUrl: u.photoUrl, role: 'editor' })
    setQuery('')
    setResults(null)
  }

  return (
    <div className="space-y-2">
      {invitees.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {invitees.map((i) => (
            <div key={i.value} className="inline-flex items-center gap-2 rounded-lg border bg-rw-surface-raised pl-2 pr-1.5 py-1 text-xs">
              {i.type === 'userId' && (
                <Avatar className="size-5 shrink-0">
                  <AvatarImage src={i.photoUrl ?? undefined} />
                  <AvatarFallback className="text-[9px]">{i.label[0]}</AvatarFallback>
                </Avatar>
              )}
              <span className="font-medium truncate max-w-[120px]">{i.label}</span>
              <div className="inline-flex rounded border border-rw-border-subtle overflow-hidden ml-auto shrink-0">
                {(['editor', 'reader'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onRoleChange(i.value, role)}
                    className={cn(
                      'px-2 py-0.5 capitalize transition-colors rounded-[4px]',
                      i.role === role
                        ? 'bg-rw-bg text-rw-accent shadow-sm'
                        : 'text-rw-text-muted hover:text-rw-text-primary'
                    )}
                  >
                    {role === 'editor' ? 'Editor' : 'Reader'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => onRemove(i.value)} className="text-rw-text-muted hover:text-rw-text-primary shrink-0">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-rw-text-muted pointer-events-none" />
        <Input
          type="text"
          placeholder="Search by name, username, or enter email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-8"
          autoComplete="off"
        />
      </div>

      {isEmail(query.trim()) && !invitees.some((i) => i.value === query.trim()) && (
        <button
          type="button"
          onClick={() => {
            onAdd({ type: 'email', value: query.trim(), label: query.trim(), role: 'editor' })
            setQuery('')
          }}
          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-rw-surface-raised transition-colors text-left"
        >
          <Plus className="size-3.5 text-rw-text-muted" />
          Invite <span className="font-medium">{query.trim()}</span> by email
        </button>
      )}

      {searching && <p className="text-xs text-rw-text-muted px-1">Searching…</p>}
      {results !== null && !searching && (
        results.length === 0 ? (
          <p className="text-xs text-rw-text-muted px-1">No users found.</p>
        ) : (
          <ul className="space-y-0.5">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => selectUser(u)}
                  className="flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 hover:bg-rw-surface-raised transition-colors text-left"
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={u.photoUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-rw-text-muted truncate">@{u.username}</p>
                  </div>
                  <UserRound className="size-3.5 text-rw-text-muted ml-auto shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
