'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { updateNotificationPreferences } from '../actions'

export interface NotificationPrefs {
  friendRequestReceived: boolean
  friendRequestAccepted: boolean
  momentInvite: boolean
  momentInviteResponse: boolean
  newPost: boolean
  memberLeft: boolean
  ownershipTransferred: boolean
  archivedMomentNotifications: boolean
  reminderCadence: string
}

interface Props {
  initialPrefs: NotificationPrefs
}

export function NotificationsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    const fd = new FormData()
    if (prefs.friendRequestReceived)       fd.append('friend_request_received',       'on')
    if (prefs.friendRequestAccepted)       fd.append('friend_request_accepted',       'on')
    if (prefs.momentInvite)                fd.append('moment_invite',                 'on')
    if (prefs.momentInviteResponse)        fd.append('moment_invite_response',        'on')
    if (prefs.newPost)                     fd.append('new_post',                      'on')
    if (prefs.memberLeft)                  fd.append('member_left',                   'on')
    if (prefs.ownershipTransferred)        fd.append('ownership_transferred',         'on')
    if (prefs.archivedMomentNotifications) fd.append('archived_moment_notifications', 'on')
    fd.append('reminder_cadence', prefs.reminderCadence)

    startTransition(async () => {
      const result = await updateNotificationPreferences(fd)
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
        <p className={`text-sm ${message.type === 'error' ? 'text-rw-danger' : 'text-rw-accent'}`}>
          {message.text}
        </p>
      )}

      <div className="space-y-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-rw-text-muted">Friends</p>

        <NotifRow
          label="Friend request received"
          description="When someone sends you a friend request"
          checked={prefs.friendRequestReceived}
          onCheckedChange={() => toggle('friendRequestReceived')}
        />
        <Separator />
        <NotifRow
          label="Friend request accepted"
          description="When someone accepts your friend request"
          checked={prefs.friendRequestAccepted}
          onCheckedChange={() => toggle('friendRequestAccepted')}
        />

        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-rw-text-muted pt-2">Moments</p>

        <NotifRow
          label="Moment invite"
          description="When someone invites you to a moment"
          checked={prefs.momentInvite}
          onCheckedChange={() => toggle('momentInvite')}
        />
        <Separator />
        <NotifRow
          label="Invite accepted or declined"
          description="When someone responds to your moment invite"
          checked={prefs.momentInviteResponse}
          onCheckedChange={() => toggle('momentInviteResponse')}
        />
        <Separator />
        <NotifRow
          label="New post"
          description="When someone adds a post to a moment you're part of"
          checked={prefs.newPost}
          onCheckedChange={() => toggle('newPost')}
        />
        <Separator />
        <NotifRow
          label="Member left"
          description="When someone leaves a moment you own"
          checked={prefs.memberLeft}
          onCheckedChange={() => toggle('memberLeft')}
        />
        <Separator />
        <NotifRow
          label="Ownership transferred"
          description="When someone transfers ownership of a moment to you"
          checked={prefs.ownershipTransferred}
          onCheckedChange={() => toggle('ownershipTransferred')}
        />
        <Separator />
        <NotifRow
          label="Archived moment activity"
          description="Receive notifications for moments you've archived"
          checked={prefs.archivedMomentNotifications}
          onCheckedChange={() => toggle('archivedMomentNotifications')}
        />

        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-rw-text-muted pt-2">Reminders</p>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Capture reminders</p>
            <p className="text-sm text-rw-text-muted">Periodic prompts to revisit and add new moments</p>
          </div>
          <Select
            value={prefs.reminderCadence}
            onValueChange={(v) => v && setPrefs((p) => ({ ...p, reminderCadence: v }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue>
                {{ weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', never: 'Never' }[prefs.reminderCadence] ?? prefs.reminderCadence}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
  onCheckedChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-rw-text-muted">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  )
}
