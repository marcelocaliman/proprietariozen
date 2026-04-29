import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ImoveisClient } from '@/components/imoveis/imoveis-client'
import type { Imovel } from '@/types'
import type { PlanoTipo } from '@/lib/stripe'

export default async function ImoveisPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const agora = new Date()
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
  // 6 meses pra trás pra calcular adimplência/histórico no card
  const mesInicioHistorico = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
    .toISOString().slice(0, 10)

  const [{ data }, { data: profile }, { data: alugueisMes }, { data: alugueisHistorico }] = await Promise.all([
    supabase
      .from('imoveis')
      .select('*, inquilinos(id, nome, cpf, ativo)')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('criado_em', { ascending: false }),

    supabase
      .from('profiles')
      .select('plano, role')
      .eq('id', user.id)
      .single(),

    supabase
      .from('alugueis')
      .select('id, imovel_id, status, data_pagamento, data_vencimento, asaas_charge_id')
      .gte('mes_referencia', mesAtual)
      .lte('mes_referencia', mesAtual.slice(0, 7) + '-31'),

    supabase
      .from('alugueis')
      .select('imovel_id, status, mes_referencia')
      .gte('mes_referencia', mesInicioHistorico)
      .lt('mes_referencia', mesAtual)
      .order('mes_referencia', { ascending: false }),
  ])

  const plano = (profile?.role === 'admin' ? 'elite' : profile?.plano ?? 'gratis') as PlanoTipo

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      <ImoveisClient
        imoveis={(data ?? []) as unknown as (Imovel & { inquilinos?: { id: string; nome: string; cpf: string | null; ativo: boolean }[] })[]}
        plano={plano}
        alugueisMes={(alugueisMes ?? []) as { id: string; imovel_id: string; status: string; data_pagamento: string | null; data_vencimento: string; asaas_charge_id: string | null }[]}
        alugueisHistorico={(alugueisHistorico ?? []) as { imovel_id: string; status: string; mes_referencia: string }[]}
      />
    </div>
  )
}
