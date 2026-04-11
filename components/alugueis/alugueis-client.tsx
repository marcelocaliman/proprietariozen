'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, AlertTriangle, Receipt, FileText,
  TrendingUp, Banknote, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PagarModal } from './pagar-modal'
import { marcarReciboGerado } from '@/app/(dashboard)/alugueis/actions'
import { formatarMoeda, formatarData } from '@/lib/helpers'

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

const STATUS = {
  pago:     { label: 'Pago',     icon: CheckCircle2,    color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/30',  variant: 'default'      as const },
  pendente: { label: 'Pendente', icon: Clock,           color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30', variant: 'outline'      as const },
  atrasado: { label: 'Atrasado', icon: AlertTriangle,   color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/30',       variant: 'destructive'  as const },
}

function diasAtraso(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86400000))
}

function gerarMeses() {
  const hoje = new Date()
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    return { valor, label: label.charAt(0).toUpperCase() + label.slice(1) }
  })
}

const sel = "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring"

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

  const meses = gerarMeses()

  // Totais
  const totalPago     = alugueis.filter(a => a.status === 'pago').reduce((s, a) => s + a.valor, 0)
  const totalPendente = alugueis.filter(a => a.status === 'pendente').reduce((s, a) => s + a.valor, 0)
  const totalAtrasado = alugueis.filter(a => a.status === 'atrasado').reduce((s, a) => s + a.valor, 0)
  const qtdPago       = alugueis.filter(a => a.status === 'pago').length

  function handlePagar(aluguel: AluguelItem) {
    setPagando(aluguel)
    setModalOpen(true)
  }

  async function handleGerarRecibo(aluguel: AluguelItem) {
    setLoadingRecibo(aluguel.id)
    try {
      const { gerarReciboPDF } = await import('@/lib/pdf')
      gerarReciboPDF({
        pagamento: {
          id: aluguel.id,
          valor: aluguel.valor,
          mes_referencia: aluguel.mes_referencia,
          data_vencimento: aluguel.data_vencimento,
          data_pagamento: aluguel.data_pagamento,
          status: aluguel.status,
          observacao: aluguel.observacao,
          imovel: { apelido: aluguel.imovel?.apelido ?? '', endereco: aluguel.imovel?.endereco ?? '' },
          inquilino: aluguel.inquilino ?? { nome: 'Sem inquilino', cpf: null, email: null, telefone: null },
        },
        proprietario: profile,
      })
      const result = await marcarReciboGerado(aluguel.id)
      if (result.error) toast.error(result.error)
      else toast.success('Recibo gerado!')
    } finally {
      setLoadingRecibo(null)
    }
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aluguéis</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {alugueis.length} registro{alugueis.length !== 1 ? 's' : ''} · {qtdPago}/{alugueis.length} pagos
          </p>
        </div>
        <select
          value={mesSelecionado}
          onChange={e => router.push(`/alugueis?mes=${e.target.value}`)}
          className={sel}
        >
          {meses.map(m => (
            <option key={m.valor} value={m.valor}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Resumo */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard titulo="Recebido"  valor={formatarMoeda(totalPago)}     descricao={`${qtdPago} pago${qtdPago !== 1 ? 's' : ''}`}                                   icon={CheckCircle2} cor="verde"  />
        <StatCard titulo="Pendente"  valor={formatarMoeda(totalPendente)} descricao={`${alugueis.filter(a => a.status === 'pendente').length} aguardando`}            icon={Clock}        cor="padrao" />
        <StatCard titulo="Atrasado"  valor={formatarMoeda(totalAtrasado)} descricao={`${alugueis.filter(a => a.status === 'atrasado').length} em atraso`}             icon={AlertTriangle} cor="vermelho" />
        <StatCard titulo="Total mês" valor={formatarMoeda(totalPago + totalPendente + totalAtrasado)} descricao={`${alugueis.length} imóve${alugueis.length !== 1 ? 'is' : 'l'}`} icon={Banknote} cor="padrao" />
      </div>

      {/* Lista */}
      {alugueis.length === 0 ? (
        <EmptyState
          icon={Building2}
          titulo="Nenhum aluguel neste mês"
          descricao="Cadastre imóveis ativos para gerar os registros automaticamente."
        />
      ) : (
        <div className="space-y-2">
          {alugueis.map(aluguel => {
            const st = STATUS[aluguel.status]
            const Icon = st.icon
            const atraso = aluguel.status === 'atrasado' ? diasAtraso(aluguel.data_vencimento) : 0

            return (
              <Card key={aluguel.id} className={`transition-colors ${st.bg}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-4">
                    {/* Ícone status */}
                    <Icon className={`h-5 w-5 shrink-0 ${st.color}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {aluguel.imovel?.apelido ?? 'Imóvel'}
                        </span>
                        <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        {atraso > 0 && (
                          <span className="text-xs text-destructive font-medium">
                            {atraso} dia{atraso !== 1 ? 's' : ''} em atraso
                          </span>
                        )}
                        {aluguel.recibo_gerado && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <FileText className="h-2.5 w-2.5" />
                            Recibo gerado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {aluguel.inquilino?.nome && <span>{aluguel.inquilino.nome}</span>}
                        <span>Vence {formatarData(aluguel.data_vencimento)}</span>
                        {aluguel.data_pagamento && (
                          <span className="text-green-600">Pago em {formatarData(aluguel.data_pagamento)}</span>
                        )}
                      </div>
                    </div>

                    {/* Valor + Ações */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-sm">{formatarMoeda(aluguel.valor)}</span>
                      {(aluguel.status === 'pendente' || aluguel.status === 'atrasado') && (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handlePagar(aluguel)}>
                          <TrendingUp className="h-3 w-3" />
                          Pagar
                        </Button>
                      )}
                      {aluguel.status === 'pago' && (
                        <Button
                          size="sm"
                          variant="outline"
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PagarModal open={modalOpen} onOpenChange={setModalOpen} aluguel={pagando} />
    </>
  )
}
