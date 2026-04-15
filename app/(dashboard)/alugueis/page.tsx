import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AlugueisClient, type AluguelItem } from '@/components/alugueis/alugueis-client'
import { gerarAlugueisMes, atualizarStatusAtrasados } from './actions'

export default async function AlugueisPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const mesParam = searchParams.mes ?? mesAtual
  const mesReferencia = `${mesParam}-01`

  // Não gera registros para meses futuros (evita poluir o banco e as métricas admin)
  const isMesAtualOuPassado = mesParam <= mesAtual

  // Gera registros faltantes + atualiza atrasados em paralelo
  await Promise.all([
    isMesAtualOuPassado ? gerarAlugueisMes(mesReferencia) : Promise.resolve({ criados: 0 }),
    atualizarStatusAtrasados(),
  ])

  const [{ data: alugueis }, { data: profile }] = await Promise.all([
    supabase
      .from('alugueis')
      .select(`
        id, valor, data_vencimento, data_pagamento, status,
        mes_referencia, observacao, recibo_gerado,
        asaas_charge_id, asaas_pix_qrcode, asaas_pix_copiaecola,
        asaas_boleto_url, valor_pago, metodo_pagamento,
        imovel:imoveis!inner(apelido, endereco, user_id, billing_mode),
        inquilino:inquilinos(nome, cpf, email, telefone)
      `)
      .eq('mes_referencia', mesReferencia)
      .eq('imovel.user_id', user.id)
      .order('data_vencimento', { ascending: true }),

    supabase
      .from('profiles')
      .select('nome, email, telefone')
      .eq('id', user.id)
      .single(),
  ])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <AlugueisClient
        alugueis={(alugueis ?? []) as AluguelItem[]}
        mesSelecionado={mesParam}
        profile={profile ?? { nome: '', email: user.email ?? '', telefone: null }}
      />
    </div>
  )
}
