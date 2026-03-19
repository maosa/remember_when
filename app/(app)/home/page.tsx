import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('first_name')
    .eq('id', user!.id)
    .single()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">
          Hey, {profile?.first_name ?? 'there'} 👋
        </h1>
        <p className="text-muted-foreground">Your moments will live here.</p>
      </div>
    </main>
  )
}
