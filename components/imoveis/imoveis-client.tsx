'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Building2, Home, Square, Briefcase, MapPin,
  Zap, MoreHorizontal, LayoutGrid, List,
  CheckCircle2, Clock, AlertTriangle, Pencil, Archive, LogOut,
  Settings2, FileText, UserPlus, AlertCircle, Send, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ImovelModal } from '@/components/imoveis/imovel-modal'
import { EditarContratoModal } from '@/components/imoveis/editar-contrato-modal'
import { EncerrarContratoModal } from '@/components/imoveis/encerrar-contrato-modal'
import { CobrancaConfigModal } from '@/components/imoveis/cobranca-config-modal'
import { GarantiaModal } from '@/components/imoveis/garantia-modal'
import { InquilinoModal } from '@/components/inquilinos/inquilino-modal'
import { arquivarImovel } from '@/app/(dashboard)/imoveis/actions'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { LIMITES_PLANO } from '@/lib/stripe'
import type { PlanoTipo } from '@/lib/stripe'
import { EmptyState } from '@/components/ui/empty-state'
import { UpgradeModal } from '@/components/upgrade-modal'
import type { Imovel } from '@/types'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Constantes ───────────────────────────────────────────────────────────────

const labelsTipo: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', kitnet: 'Kitnet',
  comercial: 'Comercial', terreno: 'Terreno', outro: 'Outro',
}

const tipoIcone: Record<string, LucideIcon> = {
  apartamento: Building2, casa: Home, kitnet: Square,
  comercial: Briefcase, terreno: MapPin, outro: Building2,
}

type AluguelMes = {
  id: string
  imovel_id: string
  status: string
  data_pagamento: string | null
  data_vencimento: string
  asaas_charge_id: string | null
}

type AluguelHistorico = {
  imovel_id: string
  status: string
  mes_referencia: string
}

function formatarDataCurta(data: string): string {
  const d = new Date(data + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(d)
    .replace('.', '')
}

function formatarCpfCurto(cpf: string | null): string {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
}

function calcularAdimplencia(historico: AluguelHistorico[]): { porcentagem: number; total: number } | null {
  if (!historico.length) return null
  const total = historico.length
  const pagos = historico.filter(a => a.status === 'pago').length
  const porcentagem = Math.round((pagos / total) * 100)
  return { porcentagem, total }
}

/** Próxima data de vencimento — calcula a partir do dia_vencimento do imóvel */
function proximoVencimento(diaVencimento: number): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const dia = hoje.getDate()
  // Se ainda não chegou no dia deste mês, é este mês. Senão, próximo mês.
  if (dia < diaVencimento) {
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    const diaAjustado = Math.min(diaVencimento, ultimoDia)
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`
  }
  const proxAno = mes === 11 ? ano + 1 : ano
  const proxMes = mes === 11 ? 0 : mes + 1
  const ultimoDia = new Date(proxAno, proxMes + 1, 0).getDate()
  const diaAjustado = Math.min(diaVencimento, ultimoDia)
  return `${proxAno}-${String(proxMes + 1).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasAte(dataStr: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataStr + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function StatusAluguelLine({
  aluguel,
  inquilinoNome,
}: {
  aluguel: AluguelMes | undefined
  inquilinoNome?: string
}) {
  if (!aluguel) {
    if (inquilinoNome) {
      return (
        <span className="text-xs text-slate-400">
          Contrato ativo · sem cobrança este mês
        </span>
      )
    }
    return <span className="text-xs text-[#94A3B8] italic">Imóvel vago</span>
  }
  if (aluguel.status === 'pago') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Pago em {aluguel.data_pagamento ? formatarData(aluguel.data_pagamento) : '—'}
      </span>
    )
  }
  if (aluguel.status === 'atrasado') {
    const dias = Math.abs(diasAte(aluguel.data_vencimento))
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {dias} dia{dias !== 1 ? 's' : ''} em atraso
      </span>
    )
  }
  // pendente
  const dias = diasAte(aluguel.data_vencimento)
  return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      Vence em {dias > 0 ? `${dias} dia${dias !== 1 ? 's' : ''}` : 'hoje'}
    </span>
  )
}

// ─── VigenciaCardLine ─────────────────────────────────────────────────────────

function VigenciaCardLine({ imovel, onEditar }: { imovel: Imovel; onEditar: () => void }) {
  // Sem contrato configurado ainda (imóvel recém-criado)
  if (imovel.valor_aluguel === 0) return null
  if (!imovel.data_fim_contrato && !imovel.contrato_indeterminado) return null
  if (imovel.contrato_indeterminado) {
    return <span className="text-xs text-slate-400 italic">Sem prazo definido</span>
  }
  const dias = diasAte(imovel.data_fim_contrato!)
  const fim = new Date(imovel.data_fim_contrato! + 'T00:00:00')
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(fim).replace('.', '')
  if (dias < 0) {
    return (
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-red-600">Venceu em {dataFormatada} · Atualize o contrato</span>
        <button onClick={onEditar} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">Renovar</button>
      </div>
    )
  }
  if (dias <= 60) {
    return <span className="text-xs text-amber-600">Contrato até {dataFormatada} · Renove o contrato</span>
  }
  const meses = Math.round(dias / 30)
  return <span className="text-xs text-slate-500">Contrato até {dataFormatada} · {meses} meses restantes</span>
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  imoveis: (Imovel & { inquilinos?: { id: string; nome: string; cpf: string | null; ativo: boolean }[] })[]
  plano: PlanoTipo
  alugueisMes: AluguelMes[]
  alugueisHistorico: AluguelHistorico[]
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ImoveisClient({ imoveis, plano, alugueisMes, alugueisHistorico }: Props) {
  const router = useRouter()
  const [open, setOpen]                         = useState(false)
  const [editando, setEditando]                 = useState<Imovel | null>(null)
  const [editContrato, setEditContrato]         = useState<Imovel | null>(null)
  const [encerrando, setEncerrando]             = useState<Imovel | null>(null)
  const [configCobranca, setConfigCobranca]     = useState<Imovel | null>(null)
  const [configGarantia, setConfigGarantia]     = useState<Imovel | null>(null)
  const [vinculandoImovel, setVinculandoImovel] = useState<Imovel | null>(null)
  const [upgradeOpen, setUpgradeOpen]           = useState(false)
  const [view, setView]                         = useState<'grid' | 'list'>('grid')

  // Persistir preferência de view
  useEffect(() => {
    const saved = localStorage.getItem('imoveis_view')
    if (saved === 'list' || saved === 'grid') setView(saved)
  }, [])
  function toggleView(v: 'grid' | 'list') {
    setView(v); localStorage.setItem('imoveis_view', v)
  }

  const limite        = LIMITES_PLANO[plano].imoveis
  const atingiuLimite = imoveis.length >= limite

  const aluguelMap = Object.fromEntries(alugueisMes.map(a => [a.imovel_id, a]))

  // Agrupa histórico por imóvel pra calcular adimplência
  const historicoPorImovel = alugueisHistorico.reduce<Record<string, AluguelHistorico[]>>((acc, a) => {
    if (!acc[a.imovel_id]) acc[a.imovel_id] = []
    acc[a.imovel_id].push(a)
    return acc
  }, {})

  // ── Stats hero ──
  const ocupados = imoveis.filter(im => {
    const inqs = (im.inquilinos as { ativo: boolean }[] | undefined) ?? []
    return inqs.some(i => i.ativo)
  }).length
  const vagos = imoveis.length - ocupados
  const pctOcupacao = imoveis.length > 0 ? Math.round((ocupados / imoveis.length) * 100) : 0
  const receitaEsperada = imoveis.reduce((s, im) => {
    const inqs = (im.inquilinos as { ativo: boolean }[] | undefined) ?? []
    if (!inqs.some(i => i.ativo)) return s
    const base = im.valor_aluguel ?? 0
    const iptu = im.iptu_mensal ?? 0
    const cond = im.condominio_mensal ?? 0
    const outros = im.outros_encargos ?? 0
    return s + base + iptu + cond + outros
  }, 0)

  function handleNovo() {
    if (atingiuLimite) { setUpgradeOpen(true); return }
    setEditando(null); setOpen(true)
  }
  function handleEditar(imovel: Imovel)        { setEditando(imovel); setOpen(true) }
  function handleEditarContrato(imovel: Imovel) { setEditContrato(imovel) }

  async function handleArquivar(imovel: Imovel) {
    if (!confirm(`Arquivar "${imovel.apelido}"?`)) return
    const result = await arquivarImovel(imovel.id)
    if (result.error) toast.error(result.error)
    else toast.success('Imóvel arquivado')
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-slate-500 font-medium">
            {imoveis.length} de {limite} {imoveis.length === 1 ? 'imóvel' : 'imóveis'} · plano {LIMITES_PLANO[plano].nome}
          </p>
          <h1
            className="font-extrabold tracking-tight text-slate-900 mt-1 leading-[1.05]"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(28px, 3vw, 40px)' }}
          >
            Seus imóveis
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle grid / lista */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => toggleView('grid')}
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
                view === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-700',
              )}
              title="Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleView('list')}
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
                view === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-700',
              )}
              title="Lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleNovo} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm h-10">
            <Plus className="h-4 w-4" />
            Novo imóvel
          </Button>
        </div>
      </div>

      {/* ── Stats hero ── */}
      {imoveis.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-7">
          {/* Hero — Receita esperada do mês */}
          <div
            className="lg:col-span-3 rounded-2xl p-7 relative overflow-hidden text-white flex flex-col justify-between min-h-[180px]"
            style={{
              background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
              boxShadow: '0 8px 32px rgba(5, 150, 105, 0.20)',
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.18)', filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'rgba(52, 211, 153, 0.10)', filter: 'blur(60px)' }} />
            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-emerald-200">
                Receita esperada deste mês
              </p>
              <p
                className="font-extrabold leading-none mt-2"
                style={{
                  fontSize: 'clamp(36px, 4.5vw, 52px)',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #6EE7B7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.025em',
                }}
              >
                {formatarMoeda(receitaEsperada)}
              </p>
            </div>
            <div className="relative z-10 mt-5">
              <div className="flex justify-between text-[11px] text-emerald-200/80 mb-1.5">
                <span>{pctOcupacao}% de ocupação</span>
                <span>{ocupados}/{imoveis.length} ocupados</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pctOcupacao}%`,
                    background: 'linear-gradient(90deg, #34D399, #6EE7B7)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stats secundários */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 py-5 px-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Total</p>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-extrabold text-slate-900 leading-none" style={{ letterSpacing: '-0.025em', fontSize: 'clamp(24px, 2.4vw, 30px)' }}>
                  {imoveis.length}
                </p>
                <p className="text-[12px] text-slate-400 mt-1.5">
                  {imoveis.length === 1 ? 'imóvel ativo' : 'imóveis ativos'}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 py-5 px-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Ocupados</p>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <UserPlus className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-extrabold text-slate-900 leading-none" style={{ letterSpacing: '-0.025em', fontSize: 'clamp(24px, 2.4vw, 30px)' }}>
                  {ocupados}
                </p>
                <p className="text-[12px] text-slate-400 mt-1.5">
                  {pctOcupacao}% de ocupação
                </p>
              </div>
            </div>
            <div className={cn(
              'rounded-2xl border py-5 px-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:-translate-y-0.5 transition-all',
              vagos > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-100',
            )}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Vagos</p>
                <div className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  vagos > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-slate-100 text-slate-400',
                )}>
                  <AlertCircle className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-extrabold text-slate-900 leading-none" style={{ letterSpacing: '-0.025em', fontSize: 'clamp(24px, 2.4vw, 30px)' }}>
                  {vagos}
                </p>
                <p className="text-[12px] text-slate-400 mt-1.5">
                  {vagos === 0 ? 'todos ocupados' : `aguardando inquilino`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Banner plano Grátis ── */}
      {plano === 'gratis' && imoveis.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <p className="text-sm text-amber-800 font-medium">
            <strong>Plano Grátis:</strong> {imoveis.length}/{limite} {imoveis.length === 1 ? 'imóvel usado' : 'imóveis usados'}. Faça upgrade para cadastrar mais.
          </p>
          <Button size="sm" className="shrink-0 bg-amber-500 hover:bg-amber-600 gap-1.5 text-white" onClick={() => setUpgradeOpen(true)}>
            <Zap className="h-3.5 w-3.5" />Fazer upgrade
          </Button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {imoveis.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Cadastre seu primeiro imóvel"
          description="É a porta de entrada do app. Depois disso você vincula um inquilino e o app começa a gerar e cobrar os aluguéis automaticamente."
          primaryCta={{
            label: 'Cadastrar imóvel',
            onClick: handleNovo,
            icon: Plus,
          }}
          steps={[
            {
              title: 'Cadastre o imóvel',
              desc: 'Endereço, valor do aluguel, dia de vencimento e índice de reajuste.',
            },
            {
              title: 'Vincule um inquilino',
              desc: 'Nome, contato e CPF — opcionalmente envie um convite para a área dele.',
            },
            {
              title: 'Comece a cobrar',
              desc: 'Modo manual (PIX/boleto seu) ou automático via Asaas — o app dispara cobrança e lembrete.',
            },
          ]}
        />

      ) : view === 'grid' ? (
        /* ── Grid de cards ─────────────────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {imoveis.map(imovel => {
            const inquilinoAtivo = (imovel.inquilinos as { id: string; nome: string; cpf: string | null; ativo: boolean }[] | undefined)
              ?.find(i => i.ativo) as { id: string; nome: string; cpf: string | null; ativo: boolean } | undefined
            const ocupado        = !!inquilinoAtivo
            const TipoIcon       = tipoIcone[imovel.tipo] ?? Building2
            const aluguel        = aluguelMap[imovel.id]

            return (
              <div
                key={imovel.id}
                onClick={() => router.push(`/imoveis/${imovel.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') router.push(`/imoveis/${imovel.id}`) }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >

                {/* Header colorido — verde para ocupado, slate para vago */}
                <div className={cn(
                  'relative px-5 py-6 flex items-center justify-center',
                  ocupado ? 'bg-[#D1FAE5]' : 'bg-slate-100',
                )}>
                  <TipoIcon className={cn('h-10 w-10', ocupado ? 'text-[#059669]' : 'text-slate-400')} />

                  {/* Dropdown 3 pontos — canto superior esquerdo */}
                  <div className="absolute top-2 left-2" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
                        ocupado
                          ? 'hover:bg-emerald-200/60 text-[#059669]'
                          : 'hover:bg-slate-200/60 text-slate-500',
                      )}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      {ocupado ? (
                        <DropdownMenuContent align="start" className="w-52">
                          <DropdownMenuItem
                            onClick={() => setEncerrando(imovel)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-2" />Encerrar contrato
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArquivar(imovel)}
                            className="text-[#94A3B8] focus:text-[#475569]"
                          >
                            <Archive className="h-3.5 w-3.5 mr-2" />Arquivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      ) : (
                        <DropdownMenuContent align="start" className="w-52">
                          <DropdownMenuItem
                            onClick={() => handleArquivar(imovel)}
                            className="text-[#94A3B8] focus:text-[#475569]"
                          >
                            <Archive className="h-3.5 w-3.5 mr-2" />Arquivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                  </div>

                  {/* Badge status — canto superior direito */}
                  <div className="absolute top-2 right-2">
                    <Badge className={cn(
                      'text-[10px] font-semibold',
                      ocupado
                        ? 'bg-[#059669] text-white hover:bg-[#059669]'
                        : 'bg-white text-[#475569] hover:bg-white border border-[#E2E8F0]',
                    )}>
                      {ocupado ? 'Ocupado' : 'Vago'}
                    </Badge>
                  </div>

                  {/* Badge vencimento contrato */}
                  {(() => {
                    if (!imovel.data_fim_contrato || imovel.contrato_indeterminado) return null
                    const dias = diasAte(imovel.data_fim_contrato)
                    if (dias < 0) {
                      return (
                        <div className="absolute top-10 left-2">
                          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                            Contrato vencido
                          </span>
                        </div>
                      )
                    }
                    if (dias <= 60) {
                      return (
                        <div className="absolute top-10 left-2">
                          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900">
                            Vence em {dias}d
                          </span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>

                {/* Body */}
                <div className="px-5 pt-4 pb-3 flex-1 space-y-3">
                  {/* Linha 1: apelido + tipo (card todo navega pro detalhe) */}
                  <div>
                    <p className="font-bold text-[15px] text-[#0F172A] truncate leading-tight">
                      {imovel.apelido}
                    </p>
                    <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                      {imovel.endereco} · {labelsTipo[imovel.tipo] ?? imovel.tipo}
                    </p>
                  </div>

                  {/* Linha 2: 3-col strip — aluguel / próximo vencimento / modo */}
                  {imovel.valor_aluguel > 0 && (
                    <div className="grid grid-cols-3 border border-[#F1F5F9] rounded-lg overflow-hidden">
                      <div className="px-3 py-2.5 border-r border-[#F1F5F9]">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium">ALUGUEL</p>
                        <p className="text-[13px] font-bold text-[#0F172A] mt-0.5 truncate">
                          {formatarMoeda(imovel.valor_aluguel)}
                        </p>
                      </div>
                      <div className="px-3 py-2.5 border-r border-[#F1F5F9]">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium">PRÓX. VENC.</p>
                        <p className="text-[13px] font-medium text-[#334155] mt-0.5 truncate">
                          {formatarDataCurta(proximoVencimento(imovel.dia_vencimento))}
                        </p>
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium">MODO</p>
                        <p className={cn(
                          'text-[13px] font-medium mt-0.5 truncate',
                          imovel.billing_mode === 'AUTOMATIC' ? 'text-emerald-700' : 'text-slate-700',
                        )}>
                          {imovel.billing_mode === 'AUTOMATIC' ? 'Asaas' : 'Manual'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Linha 3: inquilino — avatar + nome + CPF (ou alerta de pendência) */}
                  {ocupado && inquilinoAtivo && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600 shrink-0">
                        {inquilinoAtivo.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#334155] truncate">{inquilinoAtivo.nome}</p>
                        {inquilinoAtivo.cpf ? (
                          <p className="text-[11px] text-[#94A3B8] font-mono">{formatarCpfCurto(inquilinoAtivo.cpf)}</p>
                        ) : imovel.billing_mode === 'AUTOMATIC' ? (
                          <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            CPF necessário pro Asaas
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400">CPF não cadastrado</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linha 4: vigência sempre visível quando ocupado */}
                  {ocupado && imovel.valor_aluguel > 0 && (
                    <div onClick={e => e.stopPropagation()}>
                      <VigenciaCardLine imovel={imovel} onEditar={() => handleEditarContrato(imovel)} />
                    </div>
                  )}

                  {/* Linha 5: adimplência (se tem histórico) */}
                  {ocupado && (() => {
                    const adimp = calcularAdimplencia(historicoPorImovel[imovel.id] ?? [])
                    if (!adimp) return null
                    const cor = adimp.porcentagem >= 90 ? 'text-emerald-600' :
                                 adimp.porcentagem >= 70 ? 'text-amber-600' : 'text-red-600'
                    return (
                      <p className="text-[11px] text-slate-500">
                        Adimplência: <span className={cn('font-semibold', cor)}>{adimp.porcentagem}%</span>
                        {' '}<span className="text-slate-400">({adimp.total} mês{adimp.total !== 1 ? 'es' : ''})</span>
                      </p>
                    )
                  })()}
                </div>

                {/* Footer — ações principais */}
                <div className="px-5 py-3 border-t border-[#F1F5F9]">
                  {ocupado ? (
                    <div className="flex items-center justify-between gap-2">
                      <StatusAluguelLine aluguel={aluguel} inquilinoNome={inquilinoAtivo?.nome} />
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {aluguel && (aluguel.status === 'pendente' || aluguel.status === 'atrasado') && (
                          <button
                            onClick={() => router.push(`/alugueis?cobrar=${aluguel.id}`)}
                            className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5"
                          >
                            <Send className="h-3 w-3" />
                            Cobrar
                          </button>
                        )}
                        <button
                          onClick={() => handleEditar(imovel)}
                          title="Editar imóvel"
                          className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfigCobranca(imovel)}
                          title="Configurar cobrança"
                          className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfigGarantia(imovel)}
                          title="Garantia / fiador"
                          className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-slate-400 italic">Sem inquilino vinculado</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setVinculandoImovel(imovel)}
                          className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5"
                        >
                          <UserPlus className="h-3 w-3" />
                          Vincular
                        </button>
                        <button
                          onClick={() => handleEditar(imovel)}
                          title="Editar imóvel"
                          className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      ) : (
        /* ── Modo lista ────────────────────────────────────────────────── */
        <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                {['Imóvel', 'Tipo', 'Inquilino', 'Aluguel', 'Vencimento', 'Vigência', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {imoveis.map(imovel => {
                const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
                const ocupado        = !!inquilinoAtivo
                const TipoIcon       = tipoIcone[imovel.tipo] ?? Building2
                const aluguel        = aluguelMap[imovel.id]

                return (
                  <tr key={imovel.id} className="hover:bg-slate-50 transition-colors" style={{ height: 52 }}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                          ocupado ? 'bg-[#D1FAE5]' : 'bg-slate-100',
                        )}>
                          <TipoIcon className={cn('h-4 w-4', ocupado ? 'text-[#059669]' : 'text-slate-400')} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0F172A] truncate text-[13px]">{imovel.apelido}</p>
                          <p className="text-xs text-[#94A3B8] truncate max-w-40">{imovel.endereco}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#64748B] whitespace-nowrap">
                      {labelsTipo[imovel.tipo] ?? imovel.tipo}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#475569]">
                      {inquilinoAtivo?.nome ?? <span className="text-[#94A3B8] italic">Vago</span>}
                    </td>
                    <td className="px-4 py-2 text-[13px] font-medium text-[#0F172A] whitespace-nowrap">
                      {imovel.valor_aluguel > 0 ? formatarMoeda(imovel.valor_aluguel) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#64748B] whitespace-nowrap">
                      {imovel.valor_aluguel > 0 ? `Dia ${imovel.dia_vencimento}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      {imovel.contrato_indeterminado ? (
                        <span className="text-slate-400 italic">{imovel.valor_aluguel > 0 ? 'Indeterminado' : '—'}</span>
                      ) : imovel.data_fim_contrato ? (() => {
                        const dias = diasAte(imovel.data_fim_contrato!)
                        const fim = new Date(imovel.data_fim_contrato! + 'T00:00:00')
                        const dataFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(fim).replace('.', '')
                        if (dias < 0) return <span className="inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Vencido</span>
                        if (dias <= 60) return <span className="inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Vence em {dias}d</span>
                        return <span className="text-slate-500">{dataFmt}</span>
                      })() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      <StatusAluguelLine aluguel={aluguel} inquilinoNome={inquilinoAtivo?.nome} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {ocupado ? (
                          <button
                            onClick={() => handleEditar(imovel)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2.5 py-1 transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <Pencil className="h-3 w-3" />Editar
                          </button>
                        ) : (
                          <button
                            onClick={() => setVinculandoImovel(imovel)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md px-2.5 py-1 transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <UserPlus className="h-3 w-3" />Vincular
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 transition-colors text-[#64748B]">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          {ocupado ? (
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => handleEditar(imovel)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />Editar imóvel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditarContrato(imovel)}>
                                <FileText className="h-3.5 w-3.5 mr-2" />Editar contrato
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfigCobranca(imovel)}>
                                <Settings2 className="h-3.5 w-3.5 mr-2" />Configurar cobrança
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push('/alugueis')}>
                                <Building2 className="h-3.5 w-3.5 mr-2" />Ver aluguéis
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setEncerrando(imovel)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <LogOut className="h-3.5 w-3.5 mr-2" />Encerrar contrato
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleArquivar(imovel)}
                                className="text-[#94A3B8] focus:text-[#475569]"
                              >
                                <Archive className="h-3.5 w-3.5 mr-2" />Arquivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          ) : (
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => handleEditar(imovel)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />Editar imóvel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setVinculandoImovel(imovel)}>
                                <UserPlus className="h-3.5 w-3.5 mr-2" />Vincular inquilino
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleArquivar(imovel)}
                                className="text-[#94A3B8] focus:text-[#475569]"
                              >
                                <Archive className="h-3.5 w-3.5 mr-2" />Arquivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          )}
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modais ───────────────────────────────────────────────────────── */}
      <ImovelModal open={open} onOpenChange={setOpen} imovel={editando} />

      <EditarContratoModal
        open={!!editContrato}
        onOpenChange={v => { if (!v) setEditContrato(null) }}
        imovel={editContrato}
      />

      <CobrancaConfigModal
        open={!!configCobranca}
        onOpenChange={v => { if (!v) setConfigCobranca(null) }}
        imovel={configCobranca}
        plano={plano}
      />

      <GarantiaModal
        open={!!configGarantia}
        onOpenChange={v => { if (!v) setConfigGarantia(null) }}
        imovel={configGarantia}
      />

      <EncerrarContratoModal
        imovel={encerrando}
        open={!!encerrando}
        onClose={() => setEncerrando(null)}
      />

      {/* Modal de vincular inquilino — aberto direto da tela de imóveis */}
      <InquilinoModal
        open={!!vinculandoImovel}
        onOpenChange={v => { if (!v) setVinculandoImovel(null) }}
        inquilino={null}
        imoveis={vinculandoImovel ? [{ id: vinculandoImovel.id, apelido: vinculandoImovel.apelido }] : []}
        imovelIdPrefill={vinculandoImovel?.id ?? null}
      />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="limite_imoveis"
        description={`O plano Grátis permite apenas ${limite} ${limite === 1 ? 'imóvel' : 'imóveis'}. Faça upgrade para cadastrar mais e desbloquear cobrança automática, recibos PDF e alertas inteligentes.`}
      />
    </>
  )
}
