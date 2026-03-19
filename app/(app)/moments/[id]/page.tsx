import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MomentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: moment } = await supabase
    .from('moments')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!moment) notFound()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">{moment.name}</h1>
        <p className="text-muted-foreground">Moment details will live here.</p>
      </div>
    </main>
  )
}
