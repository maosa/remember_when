'use client'

import { useState } from 'react'
import { X, Tag } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  /** id forwarded to the underlying <input> so a <Label> can target it */
  inputId?: string
  maxLength?: number
}

export function TagInput({ tags, onChange, inputId = 'tag-input', maxLength = 20 }: TagInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function add(raw: string) {
    const t = raw.trim().toLowerCase()
    if (!t) return
    if (tags.includes(t)) { setError('This tag has already been added.'); return }
    setError(null)
    onChange([...tags, t])
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(value)
    } else if (e.key === 'Backspace' && value === '') {
      onChange(tags.slice(0, -1))
    }
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-1.5">
      <div
        className="flex items-start gap-2 rounded-rw-input border border-rw-border bg-rw-surface px-2.5 py-2 min-h-9 cursor-text"
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        <Tag className="size-4 shrink-0 mt-0.5 text-rw-text-placeholder" />
        <div className="flex flex-wrap gap-1.5 flex-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-rw-accent-subtle text-rw-accent px-2.5 py-1 text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="text-rw-accent/60 hover:text-rw-accent"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            id={inputId}
            value={value}
            onChange={(e) => { setValue(e.target.value.slice(0, maxLength)); setError(null) }}
            onKeyDown={handleKeyDown}
            onBlur={() => add(value)}
            placeholder={tags.length === 0 ? 'Type and press Enter…' : ''}
            className="min-w-24 flex-1 bg-transparent text-base md:text-sm outline-none placeholder:text-rw-text-placeholder"
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        </div>
      </div>
      {error
        ? <p id={`${inputId}-error`} role="alert" className="text-xs text-rw-danger">{error}</p>
        : <p className="text-xs text-rw-text-muted">Press Enter or comma to add a tag.</p>
      }
    </div>
  )
}
