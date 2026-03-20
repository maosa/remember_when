import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ProfileForm } from './_components/profile-form'
import { AvatarUpload } from './_components/avatar-upload'
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-12 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Account</h1>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">Sign out</Button>
          </form>
        </div>

        {/* Photo */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Photo</h2>
          <AvatarUpload
            currentUrl={profile.profile_photo_url ?? null}
            initials={initials}
          />
        </section>

        <Separator />

        {/* Profile */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Profile</h2>
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

        {/* Notifications */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notifications</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notification preferences</p>
              <p className="text-sm text-muted-foreground">Control when and how you hear from us</p>
            </div>
            <Link
              href="/account/notifications"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              <Bell className="size-4" />
              Manage
            </Link>
          </div>
        </section>

        <Separator />

        {/* Plan */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Free</p>
              <p className="text-sm text-muted-foreground">You&apos;re on the free plan</p>
            </div>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              <CreditCard className="size-4" />
              View plans
            </Link>
          </div>
        </section>

        <Separator />

        {/* Danger zone */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-destructive uppercase tracking-wide">Danger zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-sm text-muted-foreground">Permanently remove your personal data</p>
            </div>
            <DeleteAccountDialog username={profile.username} />
          </div>
        </section>

      </div>
    </main>
  )
}
