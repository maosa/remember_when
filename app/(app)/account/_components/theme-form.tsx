'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { THEMES, getTheme } from '@/lib/themes'
import { updateTheme } from '../actions'

interface Props {
  initialTheme: string
}

export function ThemeForm({ initialTheme }: Props) {
  const router = useRouter()
  const [theme, setTheme] = useState(initialTheme)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const selected = getTheme(theme)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)

    const formData = new FormData()
    formData.append('theme', theme)

    startTransition(async () => {
      const result = await updateTheme(formData)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Theme applied.' })
        // Re-runs the root layout so <html data-theme> updates in place —
        // the whole platform re-themes while we stay on this page.
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-rw-danger' : 'text-rw-accent'}`}>
          {message.text}
        </p>
      )}

      <div className="space-y-2">
        <Select modal={false} value={theme} onValueChange={(v) => v && setTheme(v)}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue>{selected.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {THEMES.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-rw-text-muted">{selected.description}</p>
      </div>

      <div
        role="img"
        aria-label={`${selected.label} palette colours`}
        className="flex flex-wrap gap-2"
      >
        {selected.swatches.map((hex, i) => (
          <span
            key={`${hex}-${i}`}
            className="size-8 rounded-rw-button border border-rw-border"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>

      <Button type="submit" disabled={isPending || theme === initialTheme}>
        {isPending ? 'Applying…' : 'Apply theme'}
      </Button>
    </form>
  )
}
