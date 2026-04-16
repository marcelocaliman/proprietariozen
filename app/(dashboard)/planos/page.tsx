import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PlanosClient } from '@/components/planos/planos-client'
import type { PlanoTipo } from '@/lib/stripe'

export default async function PlanosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('plano, role')
    .eq('id', user.id)
    .single()

  const plano = (profile?.role === 'admin' ? 'elite' : profile?.plano ?? 'gratis') as PlanoTipo

  return <PlanosClient planoAtual={plano} />
}
