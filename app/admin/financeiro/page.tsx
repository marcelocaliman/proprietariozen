'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, RefreshCw, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MrrChart, type MrrMonth } from '@/components/admin/mrr-chart'
import { ConversionChart, type ConversionPoint } from '@/components/admin/conversion-chart'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type MonthData = MrrMonth & {
  mes: string; mes_label: string
  usuarios_pro: number; novos_pro: number; novos_total: number
  taxa_conversao: number; variacao_pct: number
}

type FinanceiroData = {
  months: MonthData[]
  projecoes: {
    taxa_crescimento_media: number
    mrr_3meses: number; mrr_6meses: number; mrr_12meses: number
    arr_projetado: number
  }
  totals: {
    mrr_atual: number; arr_atual: number
    total_acumulado: number; ltv_medio: number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number, decimais = 0) {
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: decimais, maximumFractionDigits: decimais,
  })
}
function fmtPct(v: number) {
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-800', className)} />
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({
  title, value, sub, highlight = false,
}: {
  title: string; value: string; sub?: string; highlight?: boolean
}) {
  return (
    <Card className={cn(
      'border-slate-700/60',
      highlight ? 'bg-emerald-950/40 border-emerald-700/40' : 'bg-slate-900',
    )}>
      <CardContent className="pt-5 pb-4">
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{title}</p>
        <p className={cn('text-2xl font-bold mt-1 tabular-nums', highlight ? 'text-emerald-300' : 'text-white')}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['MRR & ARR', 'Conversão', 'Projeções'] as const
type Tab = typeof TABS[number]

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminFinanceiroPage() {
  const [data, setData]       = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('MRR & ARR')

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/financeiro')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const conversionSeries: ConversionPoint[] = (data?.months ?? []).map(m => ({
    mes_label: m.mes_label,
    taxa_conversao: m.taxa_conversao,
    total: m.novos_total,
    pro:   m.novos_pro,
  }))

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white">Financeiro</h1>
            <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] font-bold px-2">ADMIN</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">MRR, ARR, conversão e projeções</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={fetchData} disabled={loading}
          className="gap-1.5 border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error} — <button onClick={fetchData} className="underline">tentar novamente</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              tab === t
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: MRR & ARR ─────────────────────────────────────────────────── */}
      {tab === 'MRR & ARR' && (
        <div className="space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-slate-900 border-slate-700/60">
                <CardContent className="pt-5 pb-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            )) : data && (<>
              <MetricCard
                title="MRR Atual"
                value={fmt(data.totals.mrr_atual)}
                sub={data.months[data.months.length - 1]
                  ? `${fmtPct(data.months[data.months.length - 1].variacao_pct)} vs mês anterior`
                  : undefined}
                highlight
              />
              <MetricCard title="ARR" value={fmt(data.totals.arr_atual)} sub="Anualizado" />
              <MetricCard
                title="LTV Médio"
                value={fmt(data.totals.ltv_medio)}
                sub="Estimado (12 meses)"
              />
              <MetricCard title="Ticket Médio" value={fmt(29.90, 2)} sub="Plano Pro / mês" />
            </>)}
          </div>

          {/* Gráfico MRR */}
          <Card className="bg-slate-900 border-slate-700/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Evolução do MRR — últimos 12 meses
                <span className="text-[11px] text-slate-500 font-normal">Barra: bruto · Linha: líquido</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading
                ? <Skeleton className="h-[280px] w-full" />
                : <MrrChart data={data?.months ?? []} />
              }
            </CardContent>
          </Card>

          {/* Tabela histórico */}
          <Card className="bg-slate-900 border-slate-700/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">Histórico mensal</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/60">
                        {['Mês', 'Usuários Pro', 'MRR Bruto', 'Churn', 'MRR Líquido', 'Variação'].map(col => (
                          <th key={col} className="text-left py-2 px-3 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(data?.months ?? []).map(m => (
                        <tr key={m.mes} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-white font-medium">{m.mes_label}</td>
                          <td className="py-2.5 px-3 text-slate-300 tabular-nums">{m.usuarios_pro}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-medium tabular-nums">{fmt(m.mrr_bruto)}</td>
                          <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                            {m.churn_valor > 0 ? <span className="text-red-400">-{fmt(m.churn_valor)}</span> : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-amber-400 tabular-nums">{fmt(m.mrr_liquido)}</td>
                          <td className="py-2.5 px-3 tabular-nums">
                            <span className={cn(
                              'font-semibold',
                              m.variacao_pct > 0 ? 'text-emerald-400'
                                : m.variacao_pct < 0 ? 'text-red-400'
                                : 'text-slate-500',
                            )}>
                              {m.variacao_pct !== 0 ? fmtPct(m.variacao_pct) : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Totais */}
                      {data && (
                        <tr className="border-t-2 border-slate-600 bg-slate-800/50">
                          <td className="py-2.5 px-3 text-slate-400 font-semibold text-[11px] uppercase">Total</td>
                          <td className="py-2.5 px-3 text-white font-bold">{data.months[data.months.length - 1]?.usuarios_pro ?? 0}</td>
                          <td className="py-2.5 px-3 text-emerald-300 font-bold tabular-nums">{fmt(data.totals.total_acumulado)}</td>
                          <td className="py-2.5 px-3 text-slate-500">—</td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold tabular-nums">{fmt(data.totals.total_acumulado)}</td>
                          <td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Conversão ─────────────────────────────────────────────────── */}
      {tab === 'Conversão' && (
        <div className="space-y-5">
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-slate-900 border-slate-700/60">
                <CardContent className="pt-5 pb-4 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-20" />
                </CardContent>
              </Card>
            )) : data && (() => {
              const taxa = data.months[data.months.length - 1]?.taxa_conversao ?? 0
              const meta = 10
              const gap  = Math.max(0, meta - taxa)
              return (<>
                <MetricCard title="Taxa de conversão atual" value={`${taxa.toFixed(1)}%`} sub="Novos Pro / Novos cadastros" />
                <MetricCard title="Meta de conversão" value={`${meta}%`} sub="Benchmark SaaS" />
                <Card className={cn(
                  'border-slate-700/60',
                  gap > 0 ? 'bg-amber-950/30 border-amber-700/40' : 'bg-emerald-950/30 border-emerald-700/40',
                )}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Gap para meta</p>
                    <p className={cn('text-2xl font-bold mt-1', gap > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                      {gap > 0 ? `${gap.toFixed(1)}pp` : 'Atingida ✓'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {gap > 0 ? `Faltam ${gap.toFixed(1)} pp para ${meta}%` : 'Acima da meta'}
                    </p>
                  </CardContent>
                </Card>
              </>)
            })()}
          </div>

          {/* Gráfico */}
          <Card className="bg-slate-900 border-slate-700/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-400" />
                Taxa de conversão mês a mês
                <span className="text-[11px] text-slate-500 font-normal">Linha pontilhada = meta 10%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading
                ? <Skeleton className="h-[220px] w-full" />
                : <ConversionChart data={conversionSeries} meta={10} />
              }
            </CardContent>
          </Card>

          {/* Funil */}
          <Card className="bg-slate-900 border-slate-700/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">Funil de conversão</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : data && (() => {
                const total = data.months.reduce((s, m) => s + m.novos_total, 0)
                const pro   = data.months.reduce((s, m) => s + m.novos_pro, 0)
                const steps = [
                  { label: 'Total de cadastros', value: total, pct: 100 },
                  { label: 'Visitaram /planos', value: null, pct: null },
                  { label: 'Iniciaram checkout', value: null, pct: null },
                  { label: 'Converteram (Pro)', value: pro, pct: total > 0 ? Math.round(pro / total * 100) : 0 },
                ]
                return (
                  <div className="space-y-2 py-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className="h-8 rounded flex items-center px-3 text-xs font-medium text-white bg-slate-700/60"
                          style={{ width: step.pct != null ? `${Math.max(step.pct, 20)}%` : '60%', minWidth: 160 }}
                        >
                          {step.label}
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums">
                          {step.value != null ? step.value.toLocaleString('pt-BR') : <span className="text-slate-500 text-xs">N/A (sem analytics)</span>}
                        </span>
                        {step.pct != null && step.value != null && (
                          <Badge className="bg-slate-700 text-slate-300 hover:bg-slate-700 text-[10px]">
                            {step.pct}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Projeções ─────────────────────────────────────────────────── */}
      {tab === 'Projeções' && (
        <div className="space-y-5">
          {/* Disclaimer */}
          <div className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
            <DollarSign className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">
              Baseado na taxa de crescimento média dos últimos 3 meses
              {data && ` (${fmtPct(data.projecoes.taxa_crescimento_media)}/mês)`}.
              Estimativas simplificadas para MVP — não consideram churn, sazonalidade ou novos produtos.
            </p>
          </div>

          {/* Cards de projeção */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-slate-900 border-slate-700/60">
                <CardContent className="pt-5 pb-4 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            )) : data && ([
              { label: 'MRR em 3 meses', value: data.projecoes.mrr_3meses, arr: data.projecoes.mrr_3meses * 12 },
              { label: 'MRR em 6 meses', value: data.projecoes.mrr_6meses, arr: data.projecoes.mrr_6meses * 12 },
              { label: 'MRR em 12 meses', value: data.projecoes.mrr_12meses, arr: data.projecoes.arr_projetado },
            ].map((item, i) => (
              <Card key={i} className={cn(
                'border-slate-700/60',
                i === 2 ? 'bg-emerald-950/30 border-emerald-700/40' : 'bg-slate-900',
              )}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{item.label}</p>
                  <p className={cn('text-3xl font-bold mt-2 tabular-nums', i === 2 ? 'text-emerald-300' : 'text-white')}>
                    {fmt(item.value)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">ARR projetado: <span className="text-slate-300">{fmt(item.arr)}</span></p>
                  {i > 0 && data && (
                    <p className="text-xs text-emerald-400 mt-0.5 font-medium">
                      +{fmt(item.value - data.totals.mrr_atual)} vs hoje
                    </p>
                  )}
                </CardContent>
              </Card>
            )))}
          </div>

          {/* Tabela resumo */}
          {!loading && data && (
            <Card className="bg-slate-900 border-slate-700/60">
              <CardContent className="pt-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-left">
                      <th className="pb-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">Horizonte</th>
                      <th className="pb-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">MRR Estimado</th>
                      <th className="pb-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">ARR Estimado</th>
                      <th className="pb-2 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">Crescimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[
                      { label: 'Hoje',     mrr: data.totals.mrr_atual,        arr: data.totals.arr_atual },
                      { label: '3 meses',  mrr: data.projecoes.mrr_3meses,    arr: data.projecoes.mrr_3meses * 12 },
                      { label: '6 meses',  mrr: data.projecoes.mrr_6meses,    arr: data.projecoes.mrr_6meses * 12 },
                      { label: '12 meses', mrr: data.projecoes.mrr_12meses,   arr: data.projecoes.arr_projetado },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2.5 text-white font-medium">{row.label}</td>
                        <td className="py-2.5 text-emerald-400 font-bold tabular-nums">{fmt(row.mrr)}</td>
                        <td className="py-2.5 text-slate-300 tabular-nums">{fmt(row.arr)}</td>
                        <td className="py-2.5 text-slate-400 tabular-nums">
                          {i === 0 ? '—' : (
                            <span className="text-emerald-400 font-medium">
                              {fmtPct(((row.mrr - data.totals.mrr_atual) / Math.max(data.totals.mrr_atual, 1)) * 100)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
