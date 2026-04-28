import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import type { Imovel } from '@/types'
import { ImovelDetalheClient } from '@/components/imoveis/imovel-detalhe-client'

export default async function ImovelDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Imóvel + inquilinos
  const { data: imovel } = await admin
    .from('imoveis')
    .select('*, inquilinos(id, nome, cpf, telefone, email, ativo, convite_enviado_em, criado_em)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!imovel) notFound()

  // Histórico de aluguéis (últimos 12 meses)
  const hoje = new Date()
  const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1).toISOString().slice(0, 10)
  const fimJanela = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data: alugueis } = await admin
    .from('alugueis')
    .select(`
      id, valor, status, mes_referencia, data_vencimento, data_pagamento,
      valor_pago, valor_aluguel_base, valor_iptu, valor_condominio, valor_outros_encargos,
      asaas_charge_id, asaas_pix_copiaecola, asaas_boleto_url,
      lembrete_enviado_em, recibo_gerado, desconto, isento
    `)
    .eq('imovel_id', params.id)
    .gte('mes_referencia', inicioJanela)
    .lte('mes_referencia', fimJanela)
    .order('mes_referencia', { ascending: false })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Link
        href="/imoveis"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para imóveis
      </Link>

      <ImovelDetalheClient
        imovel={imovel as unknown as Imovel & {
          inquilinos: {
            id: string; nome: string; cpf: string | null; telefone: string | null
            email: string | null; ativo: boolean; convite_enviado_em: string | null
            criado_em: string
          }[]
        }}
        alugueis={(alugueis ?? []) as unknown as {
          id: string; valor: number; status: string; mes_referencia: string
          data_vencimento: string; data_pagamento: string | null
          valor_pago: number | null; valor_aluguel_base: number | null
          valor_iptu: number; valor_condominio: number; valor_outros_encargos: number
          asaas_charge_id: string | null; asaas_pix_copiaecola: string | null
          asaas_boleto_url: string | null; lembrete_enviado_em: string | null
          recibo_gerado: boolean; desconto: number | null; isento: boolean | null
        }[]}
      />
    </div>
  )
}
