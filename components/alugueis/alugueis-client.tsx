'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, AlertTriangle, Receipt, FileText,
  Banknote, Building2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PagarModal } from './pagar-modal'
import { marcarReciboGerado } from '@/app/(dashboard)/alugueis/actions'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { cn } from '@/lib/utils'

export type AluguelItem = {
  id: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'atrasado'
  mes_referencia: string
  observacao: string | null
  recibo_gerado: boolean
  imovel: { apelido: string; endereco: string } | null
  inquilino: { nome: string; cpf: string | null; email: string | null; telefone: string | null } | null
}

type Profile = { nome: string; email: string; telefone: string | null }

const STATUS_CONFIG = {
  pago:     { label: 'Pago',     icon: CheckCircle2,  badgeCls: 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]' },
  pendente: { label: 'Pendente', icon: Clock,          badgeCls: 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]' },
  atrasado: { label: 'Atrasado', icon: AlertTriangle,  badgeCls: 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2]' },
}

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
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86400000))
}

function labelMes(valor: string): string {
  const [ano, mes] = valor.split('-').map(Number)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, mes - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function navegarMes(atual: string, delta: number): string {
  const [ano, mes] = atual.split('-').map(Number)
  const d = new Date(ano, mes - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function AlugueisClient({
  alugueis,
  mesSelecionado,
  profile,
}: {
  alugueis: AluguelItem[]
  mesSelecionado: string
  profile: Profile
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [pagando, setPagando] = useState<AluguelItem | null>(null)
  const [loadingRecibo, setLoadingRecibo] = useState<string | null>(null)

  const totalPago     = alugueis.filter(a => a.status === 'pago').reduce((s, a) => s + a.valor, 0)
  const totalPendente = alugueis.filter(a => a.status === 'pendente').reduce((s, a) => s + a.valor, 0)
  const totalAtrasado = alugueis.filter(a => a.status === 'atrasado').reduce((s, a) => s + a.valor, 0)
  const qtdPago       = alugueis.filter(a => a.status === 'pago').length
  const qtdPendente   = alugueis.filter(a => a.status === 'pendente').length
  const qtdAtrasado   = alugueis.filter(a => a.status === 'atrasado').length

  function handlePagar(aluguel: AluguelItem) { setPagando(aluguel); setModalOpen(true) }

  async function handleGerarRecibo(aluguel: AluguelItem) {
    setLoadingRecibo(aluguel.id)
    try {
      const { gerarReciboPDF } = await import('@/lib/pdf')
      gerarReciboPDF({
        pagamento: {
          id: aluguel.id, valor: aluguel.valor, mes_referencia: aluguel.mes_referencia,
          data_vencimento: aluguel.data_vencimento, data_pagamento: aluguel.data_pagamento,
          status: aluguel.status, observacao: aluguel.observacao,
          imovel: { apelido: aluguel.imovel?.apelido ?? '', endereco: aluguel.imovel?.endereco ?? '' },
          inquilino: aluguel.inquilino ?? { nome: 'Sem inquilino', cpf: null, email: null, telefone: null },
        },
        proprietario: profile,
      })
      const result = await marcarReciboGerado(aluguel.id)
      if (result.error) toast.error(result.error)
      else toast.success('Recibo gerado!')
    } finally { setLoadingRecibo(null) }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Aluguéis</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {alugueis.length} registro{alugueis.length !== 1 ? 's' : ''} · {qtdPago} pago{qtdPago !== 1 ? 's' : ''} · {qtdPendente} pendente{qtdPendente !== 1 ? 's' : ''}
            {qtdAtrasado > 0 && ` · ${qtdAtrasado} em atraso`}
          </p>
        </div>
        {/* Navegação de mês */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push(`/alugueis?mes=${navegarMes(mesSelecionado, -1)}`)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-[#0F172A] w-40 text-center select-none">
            {labelMes(mesSelecionado)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push(`/alugueis?mes=${navegarMes(mesSelecionado, +1)}`)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Recebido</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1">{formatarMoeda(totalPago)}</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">{qtdPago} pago{qtdPago !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Pendente</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1">{formatarMoeda(totalPendente)}</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">{qtdPendente} aguardando</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Atrasado</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1">{formatarMoeda(totalAtrasado)}</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">{qtdAtrasado} em atraso</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Total mês</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1">{formatarMoeda(totalPago + totalPendente + totalAtrasado)}</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">{alugueis.length} imóve{alugueis.length !== 1 ? 'is' : 'l'}</p>
        </div>
      </div>

      {/* Lista estilo tabela */}
      {alugueis.length === 0 ? (
        <EmptyState icon={Building2} titulo="Nenhum aluguel neste mês" descricao="Cadastre imóveis ativos para gerar os registros automaticamente." />
      ) : (
        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
              <Banknote className="h-4 w-4" />Registros do mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <div className="divide-y divide-[#F1F5F9]">
              {alugueis.map(aluguel => {
                const st = STATUS_CONFIG[aluguel.status]
                const atraso = aluguel.status === 'atrasado' ? diasAtraso(aluguel.data_vencimento) : 0
                const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                const iniciais = nomeInq.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

                return (
                  <div
                    key={aluguel.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                  >
                    {/* Avatar inquilino */}
                    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', corAvatar(nomeInq))}>
                      {iniciais}
                    </div>

                    {/* Nome + imóvel */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{nomeInq}</p>
                      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                        <span className="truncate">{aluguel.imovel?.apelido}</span>
                        {aluguel.recibo_gerado && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            <FileText className="h-3 w-3" />recibo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Data vencimento */}
                    <div className="hidden sm:block text-xs text-[#94A3B8] shrink-0 w-20 text-right">
                      {aluguel.data_pagamento
                        ? <span className="text-[#059669]">Pago {formatarData(aluguel.data_pagamento)}</span>
                        : formatarData(aluguel.data_vencimento)
                      }
                    </div>

                    {/* Badge status + dias */}
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <Badge className={cn('text-xs font-semibold', st.badgeCls)}>{st.label}</Badge>
                      {atraso > 0 && (
                        <span className="text-[10px] text-[#991B1B] font-medium">{atraso}d em atraso</span>
                      )}
                    </div>

                    {/* Valor */}
                    <div className="text-sm font-bold text-[#0F172A] shrink-0 w-20 text-right hidden xs:block">
                      {formatarMoeda(aluguel.valor)}
                    </div>

                    {/* Ação */}
                    <div className="shrink-0">
                      {(aluguel.status === 'pendente') && (
                        <Button size="sm" className="h-7 text-xs gap-1 bg-[#059669] hover:bg-[#047857]" onClick={() => handlePagar(aluguel)}>
                          Pagar
                        </Button>
                      )}
                      {aluguel.status === 'atrasado' && (
                        <Button size="sm" className="h-7 text-xs gap-1 bg-[#DC2626] hover:bg-red-700" onClick={() => handlePagar(aluguel)}>
                          Pagar
                        </Button>
                      )}
                      {aluguel.status === 'pago' && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={loadingRecibo === aluguel.id}
                          onClick={() => handleGerarRecibo(aluguel)}
                        >
                          <Receipt className="h-3 w-3" />
                          {aluguel.recibo_gerado ? 'Recibo' : 'Gerar recibo'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <PagarModal open={modalOpen} onOpenChange={setModalOpen} aluguel={pagando} />
    </>
  )
}
