import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, ChevronRight, CreditCard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ProfileForm } from './_components/profile-form'
import { AvatarUpload } from './_components/avatar-upload'
import { ChangePasswordForm } from './_components/change-password-form'
import { DeleteAccountDialog } from './_components/delete-account-dialog'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email, username, profile_photo_url')
    .eq('id', user!.id)
    .single()

  if (!profile) redirect('/login')

  const initials = `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase()

  return (
    <main className="min-h-screen bg-rw-bg">
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Account</h1>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="text-rw-text-muted">
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </form>
        </div>

        {/* Photo */}
        <section className="space-y-4">
          <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">Photo</h2>
          <AvatarUpload
            currentUrl={profile.profile_photo_url ?? null}
            initials={initials}
          />
        </section>

        <Separator />

        {/* Profile */}
        <section className="space-y-4">
          <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">Profile</h2>
          <ProfileForm
            initialData={{
              firstName: profile.first_name,
              lastName: profile.last_name,
              email: profile.email,
              username: profile.username,
            }}
          />
        </section>

        <Separator />

        {/* Security */}
        <section className="space-y-4">
          <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">Security</h2>
          <ChangePasswordForm email={profile.email} />
        </section>

        <Separator />

        {/* Notification preferences */}
        <section className="space-y-4">
          <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">Notifications</h2>
          <Link
            href="/settings?from=account"
            className="flex items-center justify-between rounded-rw-card border border-rw-border-subtle bg-rw-surface px-4 py-3 hover:bg-rw-surface-raised/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="size-4 text-rw-text-muted shrink-0" />
              <div>
                <p className="text-sm font-medium">Notification Preferences</p>
                <p className="text-xs text-rw-text-muted">Manage what you get notified about</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-rw-text-muted shrink-0" />
          </Link>
        </section>

        <Separator />

        {/* Plans */}
        <section className="space-y-4">
          <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">Plans</h2>
          <Link
            href="/pricing"
            className="flex items-center justify-between rounded-rw-card border border-rw-border-subtle bg-rw-surface px-4 py-3 hover:bg-rw-surface-raised/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="size-4 text-rw-text-muted shrink-0" />
              <div>
                <p className="text-sm font-medium">Pricing & Plans</p>
                <p className="text-xs text-rw-text-muted">View available plans and features</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-rw-text-muted shrink-0" />
          </Link>
        </section>

        <Separator />

        {/* Danger zone */}
        <section className="rounded-rw-card border border-rw-danger/40 bg-rw-danger-subtle/40 py-5 px-6 space-y-4">
          <h2 className="font-sans text-[11px] font-semibold text-rw-danger uppercase tracking-[0.08em]">Danger zone</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-sm text-rw-text-muted">Permanently remove your personal data</p>
            </div>
            <DeleteAccountDialog username={profile.username} />
          </div>
        </section>

      </div>
    </main>
  )
}
