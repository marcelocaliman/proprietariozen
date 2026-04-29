import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { InquilinoDetalheClient } from '@/components/inquilinos/inquilino-detalhe-client'

export default async function InquilinoDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: inquilino } = await admin
    .from('inquilinos')
    .select(`
      id, nome, cpf, telefone, email, ativo, criado_em, convite_enviado_em,
      asaas_customer_id, imovel_id,
      imovel:imoveis!inner(
        id, apelido, endereco, tipo, valor_aluguel, dia_vencimento,
        billing_mode, data_inicio_contrato, data_fim_contrato,
        contrato_indeterminado, vigencia_meses,
        iptu_mensal, condominio_mensal, outros_encargos, outros_encargos_descricao,
        user_id
      )
    `)
    .eq('id', params.id)
    .single()

  if (!inquilino || (inquilino.imovel as { user_id?: string } | null)?.user_id !== user.id) {
    notFound()
  }

  const hoje = new Date()
  const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1).toISOString().slice(0, 10)
  const fimJanela = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data: alugueis } = await admin
    .from('alugueis')
    .select(`
      id, valor, status, mes_referencia, data_vencimento, data_pagamento,
      valor_pago, asaas_charge_id, lembrete_enviado_em
    `)
    .eq('inquilino_id', params.id)
    .gte('mes_referencia', inicioJanela)
    .lte('mes_referencia', fimJanela)
    .order('mes_referencia', { ascending: false })

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      <Link
        href="/inquilinos"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para inquilinos
      </Link>

      <InquilinoDetalheClient
        inquilino={inquilino as unknown as {
          id: string; nome: string; cpf: string | null; telefone: string | null
          email: string | null; ativo: boolean; criado_em: string
          convite_enviado_em: string | null; asaas_customer_id: string | null
          imovel_id: string
          imovel: {
            id: string; apelido: string; endereco: string; tipo: string
            valor_aluguel: number; dia_vencimento: number
            billing_mode: 'MANUAL' | 'AUTOMATIC' | null
            data_inicio_contrato: string | null
            data_fim_contrato: string | null
            contrato_indeterminado: boolean
            vigencia_meses: number | null
            iptu_mensal: number; condominio_mensal: number
            outros_encargos: number; outros_encargos_descricao: string | null
          } | null
        }}
        alugueis={(alugueis ?? []) as unknown as {
          id: string; valor: number; status: string; mes_referencia: string
          data_vencimento: string; data_pagamento: string | null
          valor_pago: number | null; asaas_charge_id: string | null
          lembrete_enviado_em: string | null
        }[]}
      />
    </div>
  )
}
