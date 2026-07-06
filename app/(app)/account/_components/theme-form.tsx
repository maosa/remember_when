'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { THEMES, getTheme, DEFAULT_THEME, setThemeCookie } from '@/lib/themes'
import { updateTheme } from '../actions'

interface Props {
  initialTheme: string
}

export function ThemeForm({ initialTheme }: Props) {
  const router = useRouter()
  const [theme, setTheme] = useState(initialTheme)
  const [isPending, startTransition] = useTransition()

  const selected = getTheme(theme)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData()
    formData.append('theme', theme)

    startTransition(async () => {
      const result = await updateTheme(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Theme applied.')
        // Apply to <html> immediately (covers portals) and mirror into the
        // cookie so navigating straight to a public page is themed without
        // waiting for the refresh. router.refresh() re-runs the (app) layout to
        // keep this page's server data in sync with the DB.
        const el = document.documentElement
        if (theme === DEFAULT_THEME) el.removeAttribute('data-theme')
        else el.dataset.theme = theme
        setThemeCookie(theme)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Select modal={false} value={theme} onValueChange={(v) => v && setTheme(v)}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue>{selected.label}</SelectValue>
          </SelectTrigger>
          {/* alignItemWithTrigger={false}: Base UI locks page scroll whenever
              (alignItemWithTriggerActive || modal) is true. With the default
              native-select alignment that lock stays on even with modal={false},
              so we opt into a standard anchored popover — the page scrolls while
              the dropdown is open, and the list still scrolls on its own. */}
          <SelectContent alignItemWithTrigger={false}>
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
