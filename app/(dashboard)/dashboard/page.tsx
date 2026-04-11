import { createServerSupabaseClient } from '@/lib/supabase-server'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { StatCard } from '@/components/dashboard/stat-card'
import { ReajusteAlertas } from '@/components/dashboard/reajuste-alertas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, CheckCircle, AlertCircle, Building2,
  Calendar, Banknote, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  pago:     { label: 'Pago',     badgeCls: 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]' },
  pendente: { label: 'Pendente', badgeCls: 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]' },
  atrasado: { label: 'Atrasado', badgeCls: 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2]' },
} as const

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
]

function corAvatar(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length]
}

function diasAtraso(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const agora = new Date(); agora.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((agora.getTime() - venc.getTime()) / 86_400_000))
}

type AluguelTotais = { valor: number; status: string }

type AluguelLista = {
  id: string
  valor: number
  status: string
  data_vencimento: string
  data_pagamento: string | null
  imovel: { apelido: string; user_id: string } | null
  inquilino: { nome: string } | null
}

type AluguelAtividade = {
  id: string
  valor: number
  data_pagamento: string | null
  mes_referencia: string
  imovel: { apelido: string } | null
  inquilino: { nome: string } | null
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const em7Dias = new Date(hoje); em7Dias.setDate(hoje.getDate() + 7)
  const em30Dias = new Date(hoje); em30Dias.setDate(hoje.getDate() + 30)

  const [
    { data: profile },
    { data: alugueisMes },
    { data: alugueisList },
    { data: imoveisAtivos },
    { data: proximosVencimentos },
    { data: proximosReajustes },
    { data: atividadeRecente },
  ] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user.id).single(),

    // Totais do mês
    supabase.from('alugueis')
      .select('valor, status, imovel:imoveis!inner(user_id)')
      .eq('mes_referencia', mesAtual)
      .eq('imovel.user_id', user.id) as unknown as Promise<{ data: AluguelTotais[] | null; error: unknown }>,

    // Lista detalhada do mês
    supabase.from('alugueis')
      .select('id, valor, status, data_vencimento, data_pagamento, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('mes_referencia', mesAtual)
      .eq('imovel.user_id', user.id)
      .order('data_vencimento', { ascending: true })
      .limit(8) as unknown as Promise<{ data: AluguelLista[] | null; error: unknown }>,

    // Imóveis ativos
    supabase.from('imoveis').select('id').eq('user_id', user.id).eq('ativo', true),

    // Próximos vencimentos (7 dias)
    supabase.from('alugueis')
      .select('id, valor, data_vencimento, status, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('imovel.user_id', user.id)
      .in('status', ['pendente', 'atrasado'])
      .lte('data_vencimento', em7Dias.toISOString().split('T')[0])
      .order('data_vencimento', { ascending: true })
      .limit(4) as unknown as Promise<{ data: AluguelLista[] | null; error: unknown }>,

    // Reajustes próximos
    supabase.from('imoveis')
      .select('id, apelido, data_proximo_reajuste, valor_aluguel, indice_reajuste, percentual_fixo')
      .eq('user_id', user.id).eq('ativo', true)
      .not('data_proximo_reajuste', 'is', null)
      .lte('data_proximo_reajuste', em30Dias.toISOString().split('T')[0])
      .gte('data_proximo_reajuste', hoje.toISOString().split('T')[0])
      .order('data_proximo_reajuste', { ascending: true })
      .limit(5),

    // Atividade recente (últimos pagamentos)
    supabase.from('alugueis')
      .select('id, valor, data_pagamento, mes_referencia, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('status', 'pago')
      .eq('imovel.user_id', user.id)
      .not('data_pagamento', 'is', null)
      .order('data_pagamento', { ascending: false })
      .limit(5) as unknown as Promise<{ data: AluguelAtividade[] | null; error: unknown }>,
  ])

  // Totais
  const totalReceber = alugueisMes?.filter(a => a.status !== 'cancelado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const totalRecebido = alugueisMes?.filter(a => a.status === 'pago').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const totalAtrasado = alugueisMes?.filter(a => a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const qtdImoveisAtivos = imoveisAtivos?.length ?? 0
  const qtdPagos = alugueisMes?.filter(a => a.status === 'pago').length ?? 0
  const qtdAtrasados = alugueisMes?.filter(a => a.status === 'atrasado').length ?? 0

  // Saudação
  const horaLocal = (hoje.getUTCHours() - 3 + 24) % 24
  const saudacao = horaLocal < 12 ? 'Bom dia' : horaLocal < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = (profile as { nome?: string } | null)?.nome?.split(' ')[0] ?? ''

  // Label do mês
  const labelMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(hoje)
  const labelMesCap = labelMes.charAt(0).toUpperCase() + labelMes.slice(1)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Dashboard</h1>
        <p className="text-sm text-[#475569] mt-0.5">
          {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''} — Resumo de {labelMesCap}
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Total a receber"
          valor={formatarMoeda(totalReceber)}
          descricao="no mês atual"
          icon={TrendingUp}
          cor="padrao"
        />
        <StatCard
          titulo="Recebido"
          valor={formatarMoeda(totalRecebido)}
          descricao={`${qtdPagos} pagamento${qtdPagos !== 1 ? 's' : ''}`}
          icon={CheckCircle}
          cor="verde"
        />
        <StatCard
          titulo="Em atraso"
          valor={formatarMoeda(totalAtrasado)}
          descricao={`${qtdAtrasados} pagamento${qtdAtrasados !== 1 ? 's' : ''}`}
          icon={AlertCircle}
          cor="vermelho"
        />
        <StatCard
          titulo="Imóveis ativos"
          valor={String(qtdImoveisAtivos)}
          descricao="cadastrados e ativos"
          icon={Building2}
          cor="padrao"
        />
      </div>

      {/* Layout 60/40 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] xl:grid-cols-[3fr_2fr]">
        {/* Coluna esquerda — Aluguéis do mês */}
        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
              <Banknote className="h-4 w-4" />Aluguéis do mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            {!alugueisList?.length ? (
              <p className="px-5 py-6 text-sm text-[#94A3B8] text-center">Nenhum aluguel neste mês.</p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {alugueisList.map(aluguel => {
                  const st = STATUS_CONFIG[aluguel.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendente
                  const atraso = aluguel.status === 'atrasado' ? diasAtraso(aluguel.data_vencimento) : 0
                  const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                  const iniciais = nomeInq.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

                  return (
                    <div key={aluguel.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors">
                      <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0', corAvatar(nomeInq))}>
                        {iniciais}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">{nomeInq}</p>
                        <p className="text-xs text-[#94A3B8] truncate">{aluguel.imovel?.apelido}</p>
                      </div>
                      <div className="text-xs text-[#94A3B8] hidden sm:block shrink-0 w-18 text-right">
                        {aluguel.data_pagamento
                          ? <span className="text-[#059669]">Pago {formatarData(aluguel.data_pagamento)}</span>
                          : formatarData(aluguel.data_vencimento)
                        }
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        <Badge className={cn('text-xs font-semibold', st.badgeCls)}>{st.label}</Badge>
                        {atraso > 0 && <span className="text-[10px] text-[#991B1B] font-medium">{atraso}d</span>}
                      </div>
                      <div className="text-sm font-bold text-[#0F172A] shrink-0 w-20 text-right">
                        {formatarMoeda(aluguel.valor)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna direita — empilhada */}
        <div className="space-y-4">
          {/* Próximos vencimentos */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4" />Próximos 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              {!proximosVencimentos?.length ? (
                <p className="px-5 py-4 text-sm text-[#94A3B8] text-center">Tudo em dia.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {proximosVencimentos.map(aluguel => {
                    const atraso = aluguel.status === 'atrasado' ? diasAtraso(aluguel.data_vencimento) : 0
                    const st = STATUS_CONFIG[aluguel.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendente
                    return (
                      <div key={aluguel.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A] truncate">
                            {aluguel.imovel?.apelido ?? 'Imóvel'}
                          </p>
                          <p className="text-xs text-[#94A3B8] truncate">
                            {aluguel.inquilino?.nome ?? 'Sem inquilino'}
                            {atraso > 0 && <span className="text-[#991B1B] font-medium"> · {atraso}d em atraso</span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[#0F172A]">{formatarMoeda(aluguel.valor)}</p>
                          <Badge className={cn('text-[10px] h-4 px-1.5 font-semibold', st.badgeCls)}>{st.label}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atividade recente */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" />Atividade recente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              {!atividadeRecente?.length ? (
                <p className="px-5 py-4 text-sm text-[#94A3B8] text-center">Nenhum pagamento recente.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {atividadeRecente.map(aluguel => {
                    const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                    const [ano, mes] = aluguel.mes_referencia.split('-').map(Number)
                    const labelMesAtiv = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(ano, mes - 1, 1))
                    return (
                      <div key={aluguel.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0', corAvatar(nomeInq))}>
                          {nomeInq.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#0F172A] truncate">{nomeInq}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate">
                            {aluguel.imovel?.apelido} · {labelMesAtiv}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#059669]">+{formatarMoeda(aluguel.valor)}</p>
                          {aluguel.data_pagamento && (
                            <p className="text-[10px] text-[#94A3B8]">{formatarData(aluguel.data_pagamento)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reajustes próximos */}
          {(proximosReajustes?.length ?? 0) > 0 && (
            <ReajusteAlertas imoveis={(proximosReajustes ?? []) as import('@/components/dashboard/reajuste-alertas').ImovelReajuste[]} />
          )}
        </div>
      </div>
    </div>
  )
}
