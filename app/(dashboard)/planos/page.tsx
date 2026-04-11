import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PlanosClient } from '@/components/planos/planos-client'

export default async function PlanosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('plano')
    .eq('id', user.id)
    .single()

  const plano = (profile?.plano ?? 'gratis') as 'gratis' | 'pago'

  return <PlanosClient planoAtual={plano} />
}
