import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PlanosClient } from '@/components/planos/planos-client'

export default async function PlanosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('plano, role')
    .eq('id', user.id)
    .single()

  const plano = (profile?.role === 'admin' || profile?.plano === 'pago' ? 'pago' : 'gratis') as 'gratis' | 'pago'

  return <PlanosClient planoAtual={plano} />
}
