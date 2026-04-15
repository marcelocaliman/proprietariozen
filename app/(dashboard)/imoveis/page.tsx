import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ImoveisClient } from '@/components/imoveis/imoveis-client'
import type { Imovel } from '@/types'

export default async function ImoveisPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from('imoveis')
      .select('*, inquilinos(id, nome, ativo)')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('criado_em', { ascending: false }),

    supabase
      .from('profiles')
      .select('plano, role')
      .eq('id', user.id)
      .single(),
  ])

  const plano = (profile?.role === 'admin' || profile?.plano === 'pago' ? 'pago' : 'gratis') as 'gratis' | 'pago'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <ImoveisClient imoveis={(data ?? []) as Imovel[]} plano={plano} />
    </div>
  )
}
