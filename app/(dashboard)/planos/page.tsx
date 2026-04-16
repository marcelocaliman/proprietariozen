import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PlanosClient } from '@/components/planos/planos-client'
import type { PlanoTipo } from '@/lib/stripe'

export const metadata: Metadata = {
  title: 'Planos e Preços — ProprietárioZen',
  description: 'Plano Grátis para 1 imóvel. Master R$ 49,90/mês para até 3 imóveis. Elite R$ 99,90/mês para até 5 imóveis com recursos avançados.',
}

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
