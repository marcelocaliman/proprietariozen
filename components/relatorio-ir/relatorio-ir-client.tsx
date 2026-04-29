'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Calculator, Download, AlertTriangle, Info,
  TrendingUp, ChevronDown, Loader2, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBRL, formatPct, TABELA_IRPF_2025, LIMITE_CARNE_LEAO_2025 } from '@/lib/ir'
import type { ResumoAnualIR, MesIR } from '@/lib/ir'

interface Props {
  anoAtual: number
}

// Anos disponíveis: ano atual até 2023
function gerarAnos(anoAtual: number): number[] {
  const anos: number[] = []
  for (let a = anoAtual; a >= 2023; a--) anos.push(a)
  return anos
}

function StatusBadge({ obrigado }: { obrigado: boolean }) {
  return obrigado ? (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Carnê-leão
    </span>
  ) : (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
      Isento
    </span>
  )
}

export function RelatorioIRClient({ anoAtual }: Props) {
  const [ano, setAno] = useState(anoAtual)
  const [abrirAnos, setAbrirAnos] = useState(false)
  const [dados, setDados] = useState<ResumoAnualIR | null>(null)
  const [loading, setLoading] = useState(true)
  const [baixandoPdf, setBaixandoPdf] = useState(false)

  const anos = gerarAnos(anoAtual)

  const buscarDados = useCallback(async (a: number) => {
    setLoading(true)
    setDados(null)
    try {
      const res = await fetch(`/api/relatorio-ir?ano=${a}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const msg = json.detail ? `${json.error}: ${json.detail}` : (json.error ?? 'Erro ao carregar relatório')
        toast.error(msg)
        return
      }
      const json: ResumoAnualIR = await res.json()
      setDados(json)
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { buscarDados(ano) }, [ano, buscarDados])

  async function handleBaixarPdf() {
    if (!dados) return
    setBaixandoPdf(true)
    try {
      const res = await fetch('/api/relatorio-ir/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Erro ao gerar PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-ir-${ano}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setBaixandoPdf(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-7">

      {/* Cabeçalho */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">
            Rendimentos de aluguel · cálculo IRPF {ano}
          </p>
          <h1
            className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
          >
            Relatório de IR
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Seletor de ano */}
          <div className="relative">
            <button
              onClick={() => setAbrirAnos(v => !v)}
              className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors"
            >
              {ano}
              <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
            </button>
            {abrirAnos && (
              <div className="absolute right-0 top-full mt-1 z-10 rounded-xl border border-[#E2E8F0] bg-white shadow-lg py-1 min-w-[100px]">
                {anos.map(a => (
                  <button
                    key={a}
                    onClick={() => { setAno(a); setAbrirAnos(false) }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      a === ano
                        ? 'bg-[#D1FAE5] text-[#065F46] font-semibold'
                        : 'text-[#334155] hover:bg-[#F1F5F9]',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleBaixarPdf}
            disabled={!dados || loading || baixandoPdf}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {baixandoPdf
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Baixar PDF
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#94A3B8]" />
        </div>
      )}

      {!loading && dados && (
        <>
          {/* Cards resumo */}
          <div className="grid sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Total recebido"
              value={formatBRL(dados.total_bruto)}
              icon={TrendingUp}
              color="emerald"
            />
            <SummaryCard
              label="IRPF estimado"
              value={formatBRL(dados.total_imposto)}
              icon={Calculator}
              color="purple"
            />
            <SummaryCard
              label="Média mensal"
              value={formatBRL(dados.media_mensal)}
              icon={FileText}
              color="slate"
            />
            <SummaryCard
              label="Meses c/ carnê-leão"
              value={`${dados.meses_com_obrigacao} de 12`}
              icon={AlertTriangle}
              color="amber"
            />
          </div>

          {/* Alerta carnê-leão */}
          {dados.meses_com_obrigacao > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Em <strong>{dados.meses_com_obrigacao} {dados.meses_com_obrigacao === 1 ? 'mês' : 'meses'}</strong> os
                rendimentos superaram R$ {LIMITE_CARNE_LEAO_2025.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês —
                o recolhimento via <strong>Carnê-Leão</strong> era obrigatório.
                Consulte um contador para regularização caso necessário.
              </p>
            </div>
          )}

          {/* Tabela mensal */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-semibold text-[#0F172A]">Detalhamento mensal</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Mês</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Recebido</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">IRPF</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Alíq. efetiva</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.meses.map((m: MesIR, i: number) => (
                    <tr
                      key={m.mes}
                      className={cn(
                        'border-b border-[#F1F5F9] last:border-0',
                        m.bruto === 0 ? 'opacity-40' : '',
                        i % 2 === 0 ? '' : 'bg-[#FAFAFA]',
                      )}
                    >
                      <td className="px-6 py-3 font-medium text-[#334155]">{m.label}</td>
                      <td className="px-4 py-3 text-right text-[#334155]">
                        {m.bruto > 0 ? formatBRL(m.bruto) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.imposto > 0
                          ? <span className="text-purple-700 font-medium">{formatBRL(m.imposto)}</span>
                          : <span className="text-[#94A3B8]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-[#64748B]">
                        {m.bruto > 0 ? formatPct(m.aliquota_efetiva) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.bruto > 0 && <StatusBadge obrigado={m.obrigado_carne_leao} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
                    <td className="px-6 py-3 font-semibold text-[#0F172A]">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0F172A]">{formatBRL(dados.total_bruto)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-700">{formatBRL(dados.total_imposto)}</td>
                    <td className="px-4 py-3 text-right text-[#64748B]">
                      {dados.total_bruto > 0 ? formatPct((dados.total_imposto / dados.total_bruto) * 100) : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Tabela IRPF */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">Tabela progressiva IRPF {ano}</h2>
              <Info className="h-3.5 w-3.5 text-[#94A3B8]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Faixa de rendimento</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Alíquota</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide">Dedução</th>
                  </tr>
                </thead>
                <tbody>
                  {TABELA_IRPF_2025.map((faixa, i) => (
                    <tr key={i} className={cn('border-b border-[#F1F5F9] last:border-0', i % 2 === 0 ? '' : 'bg-[#FAFAFA]')}>
                      <td className="px-6 py-3 text-[#334155]">
                        {i === 0
                          ? `Até ${formatBRL(faixa.ate)}`
                          : faixa.ate === Infinity
                            ? `Acima de ${formatBRL(TABELA_IRPF_2025[i - 1].ate)}`
                            : `De ${formatBRL(TABELA_IRPF_2025[i - 1].ate + 0.01)} até ${formatBRL(faixa.ate)}`}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#334155]">
                        {faixa.aliquota === 0 ? 'Isento' : `${faixa.aliquota}%`}
                      </td>
                      <td className="px-4 py-3 text-right text-[#64748B]">
                        {faixa.deducao > 0 ? formatBRL(faixa.deducao) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-[#94A3B8] text-center pb-4">
            Valores estimados com base nos aluguéis registrados no sistema. Consulte um contador para declaração oficial.
          </p>
        </>
      )}

      {!loading && !dados && (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <Calculator className="h-12 w-12 text-[#CBD5E1]" />
          <p className="text-sm text-[#94A3B8]">Nenhum dado encontrado para {ano}.</p>
        </div>
      )}
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: 'emerald' | 'purple' | 'slate' | 'amber'
}

function SummaryCard({ label, value, icon: Icon, color }: SummaryCardProps) {
  const iconBg = {
    emerald: 'bg-emerald-50',
    purple:  'bg-purple-50',
    slate:   'bg-slate-50',
    amber:   'bg-amber-50',
  }[color]
  const iconColor = {
    emerald: 'text-emerald-600',
    purple:  'text-purple-600',
    slate:   'text-slate-500',
    amber:   'text-amber-600',
  }[color]

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 flex items-center gap-4">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
      <div>
        <p className="text-xs text-[#64748B]">{label}</p>
        <p className="text-lg font-bold text-[#0F172A]">{value}</p>
      </div>
    </div>
  )
}
