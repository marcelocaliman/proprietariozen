import { createServerSupabaseClient } from '@/lib/supabase-server'
import { InquilinosClient } from '@/components/inquilinos/inquilinos-client'
import type { Inquilino } from '@/types'

export default async function InquilinosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const agora = new Date()
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
  const mesInicioHistorico = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
    .toISOString().slice(0, 10)

  const [{ data: inquilinos }, { data: imoveis }, { data: alugueisMes }, { data: alugueisHistorico }] = await Promise.all([
    supabase
      .from('inquilinos')
      .select('*, imovel:imoveis(id, apelido, valor_aluguel, billing_mode, data_inicio_contrato, data_fim_contrato, contrato_indeterminado)')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false }),

    supabase
      .from('imoveis')
      .select('id, apelido, inquilinos(id, ativo)')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('apelido', { ascending: true }),

    supabase
      .from('alugueis')
      .select('inquilino_id, status, data_pagamento, data_vencimento')
      .gte('mes_referencia', mesAtual)
      .lte('mes_referencia', mesAtual.slice(0, 7) + '-31')
      .not('inquilino_id', 'is', null),

    supabase
      .from('alugueis')
      .select('inquilino_id, status, mes_referencia')
      .gte('mes_referencia', mesInicioHistorico)
      .lt('mes_referencia', mesAtual)
      .not('inquilino_id', 'is', null)
      .order('mes_referencia', { ascending: false }),
  ])

  // Imóveis sem inquilino ativo
  const imoveisVagos = (imoveis ?? [])
    .filter(im => {
      const inqs = (im.inquilinos as { id: string; ativo: boolean }[] | null) ?? []
      return !inqs.some(i => i.ativo)
    })
    .map(im => ({ id: im.id, apelido: im.apelido }))

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      <InquilinosClient
        inquilinos={(inquilinos ?? []) as (Inquilino & {
          imovel?: {
            id: string; apelido: string; valor_aluguel?: number;
            billing_mode?: 'MANUAL' | 'AUTOMATIC' | null;
            data_inicio_contrato?: string | null;
            data_fim_contrato?: string | null;
            contrato_indeterminado?: boolean;
          } | null
        })[]}
        imoveis={(imoveis ?? []).map(im => ({ id: im.id, apelido: im.apelido }))}
        imoveisVagos={imoveisVagos}
        alugueisMes={(alugueisMes ?? []) as { inquilino_id: string; status: string; data_pagamento: string | null; data_vencimento: string }[]}
        alugueisHistorico={(alugueisHistorico ?? []) as { inquilino_id: string; status: string; mes_referencia: string }[]}
      />
    </div>
  )
}
