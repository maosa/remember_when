'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/ui/tag-input'
import { MONTHS, type DateMode } from '@/lib/date-helpers'
import { MomentDatePicker } from '@/app/(app)/_components/moment-date-picker'
import { createMoment } from '../actions'
import { PeopleInviteInput, type InviteeDisplay } from './people-invite-input'

const CURRENT_YEAR = new Date().getFullYear()

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMomentModal({ open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [dateMode, setDateMode] = useState<DateMode>('year')
  const [dateYear, setDateYear] = useState(String(CURRENT_YEAR))
  const [dateMonth, setDateMonth] = useState('')
  const [dateDay, setDateDay] = useState('')
  const [location, setLocation] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [invitees, setInvitees] = useState<InviteeDisplay[]>([])

  function reset() {
    setName('')
    setDateMode('year')
    setDateYear(String(CURRENT_YEAR))
    setDateMonth('')
    setDateDay('')
    setLocation('')
    setTags([])
    setInvitees([])
    setError(null)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
  }

  function addInvitee(item: InviteeDisplay) {
    if (invitees.some((i) => i.value === item.value)) return
    setInvitees((prev) => [...prev, { ...item, role: item.role ?? 'editor' }])
  }

  function removeInvitee(value: string) {
    setInvitees((prev) => prev.filter((i) => i.value !== value))
  }

  function updateInviteeRole(value: string, role: 'editor' | 'reader') {
    setInvitees((prev) => prev.map((i) => i.value === value ? { ...i, role } : i))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createMoment({
        name,
        dateYear: dateYear ? parseInt(dateYear) : null,
        dateMonth: (dateMode === 'month-year' || dateMode === 'full') && dateMonth
          ? MONTHS.indexOf(dateMonth) + 1
          : null,
        dateDay: dateMode === 'full' && dateDay ? parseInt(dateDay) : null,
        location,
        tags,
        invitees: invitees.map(({ type, value, role }) => ({ type, value, role })),
      })

      if (result.error) {
        setError(result.error)
        return
      }

      // The moment was created; some invite emails may not have gone out.
      // Surface those as a non-blocking warning rather than an error.
      if (result.inviteWarnings?.length) {
        toast.warning(
          result.inviteWarnings.length === 1
            ? result.inviteWarnings[0]
            : `Moment created, but ${result.inviteWarnings.length} invites couldn't be sent.`,
        )
      }

      onOpenChange(false)
      reset()
    })
  }

  const canSubmit = name.trim().length > 0 && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[484px] flex flex-col max-h-[90dvh]">
        <DialogHeader className="border-b-0 pb-0">
          <DialogTitle>New moment</DialogTitle>
        </DialogHeader>

        <DialogBody className="pt-5 overflow-y-auto">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="moment-name">Name <span className="text-rw-danger">*</span></Label>
            <Input
              id="moment-name"
              placeholder="e.g. Summer in Barcelona"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? 'moment-error' : undefined}
            />
          </div>

          {/* Date */}
          <MomentDatePicker
            mode={dateMode}
            year={dateYear}
            month={dateMonth}
            day={dateDay}
            setMode={setDateMode}
            setYear={setDateYear}
            setMonth={setDateMonth}
            setDay={setDateDay}
          />

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="moment-location">Location <span className="text-rw-text-muted text-xs font-normal">(optional)</span></Label>
            <Input
              id="moment-location"
              placeholder="e.g. Barcelona, Spain"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* People */}
          <div className="space-y-1.5">
            <Label>People <span className="text-rw-text-muted text-xs font-normal">(optional)</span></Label>
            <PeopleInviteInput
              invitees={invitees}
              onAdd={addInvitee}
              onRemove={removeInvitee}
              onRoleChange={updateInviteeRole}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tag-input">Tags <span className="text-rw-text-muted text-xs font-normal">(optional · max 20 chars)</span></Label>
            <TagInput tags={tags} onChange={setTags} inputId="tag-input" />
          </div>

          {error && <p id="moment-error" role="alert" className="text-sm text-rw-danger">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Creating…' : 'Create moment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

