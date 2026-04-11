import { createServerSupabaseClient } from '@/lib/supabase-server'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { StatCard } from '@/components/dashboard/stat-card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ReajusteAlertas } from '@/components/dashboard/reajuste-alertas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  type AluguelMes = { valor: number; status: string }

  // Busca dados em paralelo
  const hoje = new Date()
  const em7Dias = new Date(hoje)
  em7Dias.setDate(hoje.getDate() + 7)
  const em30Dias = new Date(hoje)
  em30Dias.setDate(hoje.getDate() + 30)

  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: alugueisMes },
    { data: imoveisAtivos },
    { data: proximosVencimentos },
    { data: proximosReajustes },
  ] = await Promise.all([
    // Aluguéis do mês atual
    supabase
      .from('alugueis')
      .select('valor, status, imovel:imoveis!inner(user_id)')
      .eq('mes_referencia', mesAtual)
      .eq('imovel.user_id', user.id) as unknown as Promise<{ data: AluguelMes[] | null; error: unknown }>,

    // Imóveis ativos
    supabase
      .from('imoveis')
      .select('id')
      .eq('user_id', user.id)
      .eq('ativo', true),

    // Próximos vencimentos (7 dias)
    supabase
      .from('alugueis')
      .select(`
        id, valor, data_vencimento, status, mes_referencia,
        imovel:imoveis!inner(apelido, user_id),
        inquilino:inquilinos(nome)
      `)
      .eq('imovel.user_id', user.id)
      .in('status', ['pendente', 'atrasado'])
      .lte('data_vencimento', em7Dias.toISOString().split('T')[0])
      .order('data_vencimento', { ascending: true })
      .limit(5),

    // Próximos reajustes (30 dias)
    supabase
      .from('imoveis')
      .select('id, apelido, data_proximo_reajuste, valor_aluguel, indice_reajuste, percentual_fixo')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .not('data_proximo_reajuste', 'is', null)
      .lte('data_proximo_reajuste', em30Dias.toISOString().split('T')[0])
      .gte('data_proximo_reajuste', hoje.toISOString().split('T')[0])
      .order('data_proximo_reajuste', { ascending: true })
      .limit(5),
  ])

  // Calcula totais
  const totalReceber = alugueisMes
    ?.filter(a => a.status !== 'cancelado')
    .reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0

  const totalRecebido = alugueisMes
    ?.filter(a => a.status === 'pago')
    .reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0

  const totalAtrasado = alugueisMes
    ?.filter(a => a.status === 'atrasado')
    .reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0

  const qtdImoveisAtivos = imoveisAtivos?.length ?? 0

  const labelsStatus: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' }> = {
    pago:     { label: 'Pago',     variant: 'default' },
    pendente: { label: 'Pendente', variant: 'outline' },
    atrasado: { label: 'Atrasado', variant: 'destructive' },
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Resumo de {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(hoje)}
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          descricao={`${alugueisMes?.filter(a => a.status === 'pago').length ?? 0} pagamentos`}
          icon={CheckCircle}
          cor="verde"
        />
        <StatCard
          titulo="Em atraso"
          valor={formatarMoeda(totalAtrasado)}
          descricao={`${alugueisMes?.filter(a => a.status === 'atrasado').length ?? 0} pagamentos`}
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

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Próximos vencimentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Próximos vencimentos
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                próximos 7 dias
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!proximosVencimentos?.length ? (
              <EmptyState
                icon={Calendar}
                titulo="Nenhum vencimento próximo"
                descricao="Não há aluguéis vencendo nos próximos 7 dias."
              />
            ) : (
              <div className="space-y-3">
                {(proximosVencimentos as Array<{
                  id: string; valor: number; data_vencimento: string
                  status: string; imovel: { apelido: string } | null
                  inquilino: { nome: string } | null
                }>).map((aluguel) => {
                  const st = labelsStatus[aluguel.status] ?? labelsStatus.pendente
                  return (
                    <div key={aluguel.id} className="flex items-center justify-between gap-3 py-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {aluguel.imovel?.apelido ?? 'Imóvel'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {aluguel.inquilino?.nome ?? 'Sem inquilino'} · vence em{' '}
                          {formatarData(aluguel.data_vencimento)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold">{formatarMoeda(aluguel.valor)}</span>
                        <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos reajustes */}
        <ReajusteAlertas imoveis={(proximosReajustes ?? []) as import('@/components/dashboard/reajuste-alertas').ImovelReajuste[]} />
      </div>
    </div>
  )
}
