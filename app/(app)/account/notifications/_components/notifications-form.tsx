'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { updateNotificationPreferences } from '../actions'

interface Props {
  initialPrefs: {
    notifNewMemory: boolean
    notifReactions: boolean
    notifReminders: boolean
    reminderCadence: string
  }
}

export function NotificationsForm({ initialPrefs }: Props) {
  const [notifNewMemory, setNotifNewMemory] = useState(initialPrefs.notifNewMemory)
  const [notifReactions, setNotifReactions] = useState(initialPrefs.notifReactions)
  const [notifReminders, setNotifReminders] = useState(initialPrefs.notifReminders)
  const [reminderCadence, setReminderCadence] = useState(initialPrefs.reminderCadence)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    const formData = new FormData()
    if (notifNewMemory) formData.append('notif_new_memory', 'on')
    if (notifReactions) formData.append('notif_reactions', 'on')
    if (notifReminders) formData.append('notif_reminders', 'on')
    formData.append('reminder_cadence', reminderCadence)

    startTransition(async () => {
      const result = await updateNotificationPreferences(formData)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Preferences saved.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
          {message.text}
        </p>
      )}

      <div className="space-y-4">
        <NotifRow
          label="New shared moment"
          description="When someone adds you to a new moment"
          checked={notifNewMemory}
          onCheckedChange={setNotifNewMemory}
        />

        <Separator />

        <NotifRow
          label="Reactions"
          description="When someone reacts to your contribution"
          checked={notifReactions}
          onCheckedChange={setNotifReactions}
        />

        <Separator />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Memory reminders</p>
            <p className="text-sm text-muted-foreground">Periodic prompts to revisit and add moments</p>
          </div>
          <Switch
            checked={notifReminders}
            onCheckedChange={setNotifReminders}
            aria-label="Memory reminders"
          />
        </div>

        {notifReminders && (
          <div className="pl-0 space-y-2">
            <p className="text-sm font-medium">Reminder frequency</p>
            <Select value={reminderCadence} onValueChange={(v) => v && setReminderCadence(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save preferences'}
      </Button>
    </form>
  )
}

function NotifRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  )
}
