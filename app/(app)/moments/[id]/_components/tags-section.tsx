'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { addTag, removeTag } from '../actions'

interface Props {
  momentId: string
  tags: Array<{ id: string; tag: string }>
  canEdit: boolean
}

export function TagsSection({ momentId, tags, canEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAddTag(raw: string) {
    const t = raw.trim()
    if (!t) return
    setError(null)
    startTransition(async () => {
      const res = await addTag(momentId, t)
      if (res.error) setError(res.error)
      else setInput('')
    })
  }

  function handleRemoveTag(tagId: string) {
    startTransition(async () => {
      await removeTag(momentId, tagId)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(input)
    }
  }

  if (tags.length === 0 && !canEdit) return null

  return (
    <section className="mx-auto max-w-3xl px-4 py-4 border-b space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <Badge key={t.id} variant="secondary" className="gap-1 pl-2 pr-1.5">
            {t.tag}
            {canEdit && (
              <button
                type="button"
                onClick={() => handleRemoveTag(t.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Remove tag ${t.tag}`}
              >
                <X className="size-2.5" />
              </button>
            )}
          </Badge>
        ))}

        {canEdit && (
          <div className="flex items-center gap-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 20))}
              onKeyDown={handleKeyDown}
              onBlur={() => handleAddTag(input)}
              placeholder="Add tag…"
              className="h-6 w-24 rounded-md border border-dashed border-input bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-ring"
              disabled={isPending}
            />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  )
}
