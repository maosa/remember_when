import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
    .select('first_name, last_name, email, username')
    .eq('id', user!.id)
    .single()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">
            {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-muted-foreground">@{profile?.username}</p>
          <p className="text-muted-foreground text-sm">{profile?.email}</p>
        </div>
        <p className="text-muted-foreground">Account settings will live here.</p>
        <form action={signOut}>
          <Button variant="outline" type="submit">Sign out</Button>
        </form>
      </div>
    </main>
  )
}
