'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { PenTool, Eye, UserPlus, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { isValidEmail } from '@/lib/validation'
import { inviteMember } from '../actions'

// ─── Invite dialog (multi-step: role → lookup method → result) ────────────────

type InviteStep = 'role' | 'lookup'
type LookupMethod = 'username' | 'email'
type LookupStatus = 'idle' | 'checking' | 'found' | 'not_found' | 'unregistered' | 'invalid_email'
type FeedbackKind =
  | 'error'
  | 'not_found'

interface InviteFeedback {
  kind: FeedbackKind
  message: string
}

export function InviteDialog({
  momentId,
  buttonClassName,
}: {
  momentId: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<InviteStep>('role')
  const [role, setRole] = useState<'editor' | 'reader'>('reader')
  const [method, setMethod] = useState<LookupMethod>('username')
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<InviteFeedback | null>(null)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [lookupDisplay, setLookupDisplay] = useState<string>('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Debounced real-time lookup ───────────────────────────────────────────────
  useEffect(() => {
    const val = input.trim().replace(/^@/, '')
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced async lookup; reset when the input is cleared
    if (!val) { setLookupStatus('idle'); setLookupDisplay(''); return }

    if (method === 'email' && !isValidEmail(val)) {
      setLookupStatus('invalid_email'); setLookupDisplay(''); return
    }

    setLookupStatus('checking')
    setLookupDisplay('')

    debounceTimer.current = setTimeout(async () => {
      const supabase = createClient()
      if (method === 'username') {
        const { data } = await supabase
          .from('users')
          .select('username, first_name, last_name')
          .eq('username', val.toLowerCase())
          .maybeSingle()
        if (data) {
          setLookupStatus('found')
          setLookupDisplay(`@${data.username} (${data.first_name} ${data.last_name})`)
        } else {
          setLookupStatus('not_found')
        }
      } else {
        const { data } = await supabase
          .from('users')
          .select('username, first_name, last_name')
          .eq('email', val.toLowerCase())
          .maybeSingle()
        if (data) {
          setLookupStatus('found')
          setLookupDisplay(`@${data.username} (${data.first_name} ${data.last_name})`)
        } else {
          setLookupStatus('unregistered')
        }
      }
    }, 500)

    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [input, method])

  function resetLookup() {
    setLookupStatus('idle')
    setLookupDisplay('')
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }

  function handleOpen(v: boolean) {
    setOpen(v)
    if (!v) {
      setStep('role')
      setRole('reader')
      setMethod('username')
      setInput('')
      setFeedback(null)
      resetLookup()
    }
  }

  function handleSend() {
    const val = input.trim()
    if (!val) return
    setFeedback(null)

    startTransition(async () => {
      const res = await inviteMember(momentId, method, val, role)

      if ('error' in res) {
        setFeedback({ kind: 'error', message: res.error })
        return
      }
      if ('notFound' in res) {
        setFeedback({
          kind: 'not_found',
          message: 'No account found with that username. Try a different username or invite by email instead.',
        })
        return
      }
      if (res.success === 'email_unregistered') {
        toast.success("Invite sent — they'll receive an email to join.")
        setInput('')
        resetLookup()
        return
      }
      const username = res.invitedUsername
      toast.success(`Invite sent to @${username}`)
      setInput('')
      resetLookup()
    })
  }

  // "Send invite" is only enabled when we know what we're sending to
  const canSend = !isPending && (lookupStatus === 'found' || lookupStatus === 'unregistered')

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className={buttonClassName} aria-label="Invite someone" />}>
        <UserPlus className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
        </DialogHeader>

        {step === 'role' ? (
          <>
            <DialogBody className="gap-3">
              <p className="text-sm text-rw-text-muted">What role should they have?</p>
              <div className="flex gap-2">
                <RoleButton
                  active={role === 'editor'}
                  onClick={() => setRole('editor')}
                  icon={<PenTool className="size-3.5" />}
                  label="Editor"
                  description="Can post and edit"
                />
                <RoleButton
                  active={role === 'reader'}
                  onClick={() => setRole('reader')}
                  icon={<Eye className="size-3.5" />}
                  label="Reader"
                  description="View only"
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setStep('lookup')}>Next</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody className="gap-4">
              {/* Role indicator + change */}
              <div className="flex items-center gap-1.5 text-xs text-rw-text-muted">
                {role === 'editor' ? <PenTool className="size-3" /> : <Eye className="size-3" />}
                Inviting as{' '}
                <span className="font-medium text-rw-text-primary capitalize">{role}</span>
                <button
                  type="button"
                  onClick={() => { setStep('role'); setFeedback(null); setInput(''); resetLookup() }}
                  className="ml-auto text-xs underline underline-offset-2 hover:text-rw-text-primary"
                >
                  Change
                </button>
              </div>

              {/* Method toggle */}
              <div className="flex rounded-md border overflow-hidden text-sm">
                {(['username', 'email'] as LookupMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMethod(m); setFeedback(null); setInput(''); resetLookup() }}
                    className={cn(
                      'flex-1 py-1.5 text-center capitalize transition-colors',
                      method === m
                        ? 'bg-rw-accent text-white font-medium'
                        : 'text-rw-text-muted hover:bg-rw-surface-raised'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Input + inline lookup indicator */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    placeholder={method === 'username' ? '@username' : 'email@example.com'}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setFeedback(null) }}
                    onKeyDown={(e) => e.key === 'Enter' && canSend && handleSend()}
                    autoFocus
                    type={method === 'email' ? 'email' : 'text'}
                    className="pr-8"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {lookupStatus === 'checking' && <Loader2 className="size-4 animate-spin text-rw-text-placeholder" />}
                    {lookupStatus === 'found' && <CheckCircle className="size-4 text-rw-accent" />}
                    {(lookupStatus === 'not_found' || lookupStatus === 'invalid_email') && <XCircle className="size-4 text-rw-danger" />}
                  </div>
                </div>

                {/* Lookup hints — shown before sending */}
                {!feedback && (
                  <>
                    {lookupStatus === 'found' && (
                      <p className="text-xs text-rw-accent">{lookupDisplay}</p>
                    )}
                    {lookupStatus === 'not_found' && method === 'username' && (
                      <p className="text-xs text-rw-danger">No account with this username. Try inviting by email instead.</p>
                    )}
                    {lookupStatus === 'unregistered' && (
                      <p className="text-xs text-rw-text-muted">Not registered — they&apos;ll receive an invite email to join.</p>
                    )}
                    {lookupStatus === 'invalid_email' && (
                      <p className="text-xs text-rw-text-muted">Enter a valid email address.</p>
                    )}
                  </>
                )}
              </div>

              {/* Post-send feedback (errors / not-found only; successes go to toast) */}
              {feedback && (
                <p className="text-sm rounded-md px-3 py-2 bg-rw-danger-subtle text-rw-danger">
                  {feedback.message}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button onClick={handleSend} disabled={!canSend}>
                {isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors',
        active
          ? 'border-rw-accent bg-rw-accent-subtle/30 text-rw-text-primary'
          : 'border-rw-border text-rw-text-muted hover:border-rw-accent hover:text-rw-text-primary'
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-medium leading-none">{label}</p>
        <p className="text-[10px] mt-0.5 opacity-70">{description}</p>
      </div>
    </button>
  )
}
