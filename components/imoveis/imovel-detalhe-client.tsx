'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Home, Square, Briefcase, MapPin,
  TrendingUp, CheckCircle2, AlertCircle,
  Phone, Mail, IdCard, Shield, FileText, Settings2, Pencil,
  Send, ArrowRight, Banknote,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CobrancaConfigModal } from '@/components/imoveis/cobranca-config-modal'
import { GarantiaModal } from '@/components/imoveis/garantia-modal'
import { EditarContratoModal } from '@/components/imoveis/editar-contrato-modal'
import { ImovelModal } from '@/components/imoveis/imovel-modal'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import type { Imovel, GarantiaTipo } from '@/types'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const tipoIcone: Record<string, LucideIcon> = {
  apartamento: Building2, casa: Home, kitnet: Square,
  comercial: Briefcase, terreno: MapPin, outro: Building2,
}

const tipoLabel: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', kitnet: 'Kitnet',
  comercial: 'Comercial', terreno: 'Terreno', outro: 'Outro',
}

const garantiaLabel: Record<GarantiaTipo, string> = {
  caucao: 'Caução',
  fiador: 'Fiador',
  seguro_fianca: 'Seguro fiança',
  titulo_capitalizacao: 'Título de capitalização',
  sem_garantia: 'Sem garantia',
}

const indiceLabel: Record<string, string> = {
  igpm: 'IGP-M',
  ipca: 'IPCA',
  fixo: 'Percentual fixo',
}

const statusBadge: Record<string, string> = {
  pago: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-amber-100 text-amber-700',
  atrasado: 'bg-red-100 text-red-700',
  cancelado: 'bg-slate-100 text-slate-600',
  estornado: 'bg-slate-100 text-slate-600',
}

const statusLabel: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}

type Aluguel = {
  id: string; valor: number; status: string; mes_referencia: string
  data_vencimento: string; data_pagamento: string | null
  valor_pago: number | null; valor_aluguel_base: number | null
  valor_iptu: number; valor_condominio: number; valor_outros_encargos: number
  asaas_charge_id: string | null; asaas_pix_copiaecola: string | null
  asaas_boleto_url: string | null; lembrete_enviado_em: string | null
  recibo_gerado: boolean; desconto: number | null; isento: boolean | null
}

type ImovelDetalhado = Omit<Imovel, 'inquilinos'> & {
  inquilinos: {
    id: string; nome: string; cpf: string | null; telefone: string | null
    email: string | null; ativo: boolean; convite_enviado_em: string | null
    criado_em: string
  }[]
}

function formatarMes(ref: string): string {
  const [ano, mes] = ref.split('-').map(Number)
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatarCpf(cpf: string | null): string {
  if (!cpf) return ''
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
}

function diasAte(data: string): number {
  const alvo = new Date(data + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

interface Props {
  imovel: ImovelDetalhado
  alugueis: Aluguel[]
}

export function ImovelDetalheClient({ imovel, alugueis }: Props) {
  const router = useRouter()
  const [editandoImovel, setEditandoImovel] = useState(false)
  const [editandoContrato, setEditandoContrato] = useState(false)
  const [configCobranca, setConfigCobranca] = useState(false)
  const [configGarantia, setConfigGarantia] = useState(false)

  const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
  const TipoIcon = tipoIcone[imovel.tipo] ?? Building2

  // Stats
  const ano = new Date().getFullYear()
  const alugueisDoAno = alugueis.filter(a => a.mes_referencia.startsWith(String(ano)))
  const totalRecebido = alugueisDoAno
    .filter(a => a.status === 'pago')
    .reduce((s, a) => s + (a.valor_pago ?? a.valor), 0)
  const totalEsperado = alugueisDoAno
    .filter(a => a.status !== 'cancelado' && a.status !== 'estornado')
    .reduce((s, a) => s + a.valor, 0)
  const adimplencia = useMemo(() => {
    const computaveis = alugueis.filter(a => a.status !== 'cancelado' && a.status !== 'estornado' && a.status !== 'pendente')
    if (!computaveis.length) return null
    const pagos = computaveis.filter(a => a.status === 'pago').length
    return Math.round((pagos / computaveis.length) * 100)
  }, [alugueis])

  // Total mensal incluindo encargos
  const valorMensalTotal =
    imovel.valor_aluguel + (imovel.iptu_mensal ?? 0) +
    (imovel.condominio_mensal ?? 0) + (imovel.outros_encargos ?? 0)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className={cn(
            'h-14 w-14 rounded-xl flex items-center justify-center shrink-0',
            inquilinoAtivo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
          )}>
            <TipoIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{imovel.apelido}</h1>
            <p className="text-sm text-slate-500 truncate">{imovel.endereco}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge className={cn(
                'text-[11px]',
                inquilinoAtivo ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700',
              )}>
                {inquilinoAtivo ? 'Ocupado' : 'Vago'}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {tipoLabel[imovel.tipo]}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {imovel.billing_mode === 'AUTOMATIC' ? 'Asaas' : 'Manual'}
              </Badge>
              {imovel.garantia_tipo && (
                <Badge variant="outline" className="text-[11px]">
                  <Shield className="h-3 w-3 mr-1" />
                  {garantiaLabel[imovel.garantia_tipo]}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditandoImovel(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          {inquilinoAtivo && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={() => router.push('/alugueis')}
            >
              <Send className="h-3.5 w-3.5" />
              Cobrar agora
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Aluguel mensal</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatarMoeda(valorMensalTotal)}</p>
            {valorMensalTotal !== imovel.valor_aluguel && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                base {formatarMoeda(imovel.valor_aluguel)} + encargos
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Recebido em {ano}</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{formatarMoeda(totalRecebido)}</p>
            {totalEsperado > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                de {formatarMoeda(totalEsperado)} esperado
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Adimplência (12m)</p>
            <p className={cn(
              'text-xl font-bold mt-1',
              adimplencia == null ? 'text-slate-400' :
              adimplencia >= 90 ? 'text-emerald-700' :
              adimplencia >= 70 ? 'text-amber-700' : 'text-red-700',
            )}>
              {adimplencia == null ? '—' : `${adimplencia}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Próximo vencimento</p>
            <p className="text-xl font-bold text-slate-900 mt-1">Dia {imovel.dia_vencimento}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">de cada mês</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 rounded-lg p-1 w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos ({alugueis.length})</TabsTrigger>
          <TabsTrigger value="inquilino">Inquilino</TabsTrigger>
          <TabsTrigger value="garantia">Garantia</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* ── Visão geral ── */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contrato */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pt-0">
                <Row label="Início" value={imovel.data_inicio_contrato ? formatarData(imovel.data_inicio_contrato) : '—'} />
                <Row label="Fim" value={
                  imovel.contrato_indeterminado ? 'Indeterminado' :
                  imovel.data_fim_contrato ? formatarData(imovel.data_fim_contrato) : '—'
                } />
                {imovel.data_fim_contrato && !imovel.contrato_indeterminado && (
                  <Row label="Tempo restante" value={(() => {
                    const dias = diasAte(imovel.data_fim_contrato)
                    if (dias < 0) return <span className="text-red-600">Vencido há {Math.abs(dias)} dias</span>
                    if (dias < 30) return <span className="text-red-600">{dias} dias</span>
                    if (dias < 60) return <span className="text-amber-600">{dias} dias</span>
                    return `${Math.round(dias / 30)} meses`
                  })()} />
                )}
                <Row label="Vigência" value={imovel.vigencia_meses ? `${imovel.vigencia_meses} meses` : '—'} />
                <button
                  onClick={() => setEditandoContrato(true)}
                  className="text-xs text-emerald-600 hover:underline mt-2"
                >
                  Editar contrato →
                </button>
              </CardContent>
            </Card>

            {/* Reajuste */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  Reajuste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pt-0">
                <Row label="Índice" value={indiceLabel[imovel.indice_reajuste] ?? imovel.indice_reajuste} />
                {imovel.indice_reajuste === 'fixo' && imovel.percentual_fixo != null && (
                  <Row label="Percentual" value={`${imovel.percentual_fixo}%`} />
                )}
                <Row label="Próximo reajuste" value={
                  imovel.data_proximo_reajuste ? formatarData(imovel.data_proximo_reajuste) : '—'
                } />
                {imovel.data_proximo_reajuste && (() => {
                  const dias = diasAte(imovel.data_proximo_reajuste)
                  if (dias < 0) return <Row label="Status" value={<span className="text-red-600">Atrasado há {Math.abs(dias)} dias</span>} />
                  if (dias <= 30) return <Row label="Status" value={<span className="text-amber-600">Em {dias} dias</span>} />
                  return <Row label="Status" value={<span className="text-slate-500">Em {dias} dias</span>} />
                })()}
              </CardContent>
            </Card>

            {/* Encargos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-slate-500" />
                  Composição do aluguel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pt-0">
                <Row label="Aluguel base" value={formatarMoeda(imovel.valor_aluguel)} />
                {(imovel.iptu_mensal ?? 0) > 0 && <Row label="IPTU" value={formatarMoeda(imovel.iptu_mensal)} />}
                {(imovel.condominio_mensal ?? 0) > 0 && <Row label="Condomínio" value={formatarMoeda(imovel.condominio_mensal)} />}
                {(imovel.outros_encargos ?? 0) > 0 && (
                  <Row
                    label={imovel.outros_encargos_descricao ?? 'Outros'}
                    value={formatarMoeda(imovel.outros_encargos)}
                  />
                )}
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <Row
                    label={<span className="font-semibold">Total</span>}
                    value={<span className="font-bold text-slate-900">{formatarMoeda(valorMensalTotal)}</span>}
                  />
                </div>
                <button
                  onClick={() => setConfigCobranca(true)}
                  className="text-xs text-emerald-600 hover:underline mt-2"
                >
                  Editar encargos →
                </button>
              </CardContent>
            </Card>

            {/* Multa/juros/desconto */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-500" />
                  Cobrança e penalidades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pt-0">
                <Row label="Modo" value={imovel.billing_mode === 'AUTOMATIC' ? 'Automático (Asaas)' : 'Manual (PIX)'} />
                <Row label="Multa por atraso" value={`${imovel.multa_percentual}%`} />
                <Row label="Juros ao mês" value={`${imovel.juros_percentual}%`} />
                <Row label="Desconto pontualidade" value={`${imovel.desconto_percentual}%`} />
                <button
                  onClick={() => setConfigCobranca(true)}
                  className="text-xs text-emerald-600 hover:underline mt-2"
                >
                  Configurar cobrança →
                </button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Pagamentos ── */}
        <TabsContent value="pagamentos">
          <Card>
            <CardContent className="p-0">
              {alugueis.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-12">
                  Nenhum aluguel registrado nos últimos 12 meses.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase">Mês</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase">Vencimento</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase">Valor</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase">Pago em</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alugueis.map(a => (
                      <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-900">{formatarMes(a.mes_referencia)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatarData(a.data_vencimento)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatarMoeda(a.valor)}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-[10px] font-medium', statusBadge[a.status])}>
                            {statusLabel[a.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {a.data_pagamento ? formatarData(a.data_pagamento) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(a.status === 'pendente' || a.status === 'atrasado') && (
                            <Link
                              href={`/alugueis?cobrar=${a.id}`}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline"
                            >
                              Cobrar
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Inquilino ── */}
        <TabsContent value="inquilino" className="space-y-4">
          {inquilinoAtivo ? (
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{inquilinoAtivo.nome}</h3>
                    <p className="text-xs text-slate-500">
                      Inquilino ativo desde {formatarData(inquilinoAtivo.criado_em)}
                    </p>
                  </div>
                  <Link
                    href="/inquilinos"
                    className="text-xs text-emerald-600 hover:underline whitespace-nowrap"
                  >
                    Ver perfil →
                  </Link>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <Row
                    icon={<IdCard className="h-3.5 w-3.5 text-slate-400" />}
                    label="CPF"
                    value={inquilinoAtivo.cpf
                      ? <span className="font-mono">{formatarCpf(inquilinoAtivo.cpf)}</span>
                      : imovel.billing_mode === 'AUTOMATIC'
                        ? <span className="text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Necessário pro Asaas</span>
                        : <span className="text-slate-400">Não cadastrado</span>
                    }
                  />
                  <Row
                    icon={<Phone className="h-3.5 w-3.5 text-slate-400" />}
                    label="Telefone"
                    value={inquilinoAtivo.telefone ?? '—'}
                  />
                  <Row
                    icon={<Mail className="h-3.5 w-3.5 text-slate-400" />}
                    label="E-mail"
                    value={inquilinoAtivo.email ?? <span className="text-slate-400">Não cadastrado</span>}
                  />
                  <Row
                    icon={<CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />}
                    label="Convite enviado"
                    value={inquilinoAtivo.convite_enviado_em
                      ? formatarData(inquilinoAtivo.convite_enviado_em)
                      : <span className="text-slate-400">Nunca</span>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-slate-500">
                <p className="text-sm">Imóvel sem inquilino ativo</p>
                <Link href="/inquilinos" className="text-emerald-600 text-sm hover:underline mt-2 inline-block">
                  Vincular inquilino →
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Histórico de inquilinos anteriores */}
          {imovel.inquilinos.filter(i => !i.ativo).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Inquilinos anteriores</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {imovel.inquilinos.filter(i => !i.ativo).map(i => (
                  <div key={i.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-slate-700">{i.nome}</span>
                    <span className="text-xs text-slate-400">desde {formatarData(i.criado_em)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Garantia ── */}
        <TabsContent value="garantia">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-500" />
                Garantia do contrato
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setConfigGarantia(true)} className="gap-1">
                <Pencil className="h-3 w-3" />
                Editar
              </Button>
            </CardHeader>
            <CardContent className="pt-2 space-y-2 text-sm">
              <Row label="Tipo" value={imovel.garantia_tipo ? garantiaLabel[imovel.garantia_tipo] : <span className="text-slate-400">Não configurado</span>} />

              {imovel.garantia_tipo === 'caucao' && (
                <Row label="Valor" value={imovel.garantia_valor ? formatarMoeda(imovel.garantia_valor) : '—'} />
              )}

              {imovel.garantia_tipo === 'titulo_capitalizacao' && (
                <Row label="Valor do título" value={imovel.garantia_valor ? formatarMoeda(imovel.garantia_valor) : '—'} />
              )}

              {imovel.garantia_tipo === 'fiador' && (
                <>
                  <Row label="Nome" value={imovel.fiador_nome ?? '—'} />
                  <Row label="CPF" value={imovel.fiador_cpf ? formatarCpf(imovel.fiador_cpf) : '—'} />
                  <Row label="Telefone" value={imovel.fiador_telefone ?? '—'} />
                  <Row label="E-mail" value={imovel.fiador_email ?? '—'} />
                </>
              )}

              {imovel.garantia_tipo === 'seguro_fianca' && (
                <>
                  <Row label="Seguradora" value={imovel.seguro_fianca_seguradora ?? '—'} />
                  <Row label="Apólice" value={imovel.seguro_fianca_apolice ?? '—'} />
                  <Row label="Validade" value={
                    imovel.seguro_fianca_validade ? (() => {
                      const dias = diasAte(imovel.seguro_fianca_validade)
                      if (dias < 0) return <span className="text-red-600">Vencida em {formatarData(imovel.seguro_fianca_validade)}</span>
                      if (dias < 30) return <span className="text-amber-600">{formatarData(imovel.seguro_fianca_validade)} ({dias}d)</span>
                      return formatarData(imovel.seguro_fianca_validade)
                    })() : '—'
                  } />
                </>
              )}

              {imovel.garantia_observacao && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1">Observação</p>
                  <p className="text-sm text-slate-700">{imovel.garantia_observacao}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Config ── */}
        <TabsContent value="config">
          <Card>
            <CardContent className="p-5 space-y-3">
              <ConfigItem
                titulo="Editar imóvel"
                descricao="Apelido, endereço, tipo, dados básicos"
                onClick={() => setEditandoImovel(true)}
              />
              <ConfigItem
                titulo="Editar contrato"
                descricao="Vigência, datas de início e fim, índice de reajuste"
                onClick={() => setEditandoContrato(true)}
              />
              <ConfigItem
                titulo="Configurar cobrança"
                descricao="Modo (Manual/Automático), multa, juros, desconto, encargos extras"
                onClick={() => setConfigCobranca(true)}
              />
              <ConfigItem
                titulo="Garantia / fiador"
                descricao="Caução, fiador, seguro fiança ou outros"
                onClick={() => setConfigGarantia(true)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modais ── */}
      <ImovelModal open={editandoImovel} onOpenChange={setEditandoImovel} imovel={imovel} />
      <EditarContratoModal
        open={editandoContrato}
        onOpenChange={setEditandoContrato}
        imovel={imovel}
      />
      <CobrancaConfigModal
        open={configCobranca}
        onOpenChange={setConfigCobranca}
        imovel={imovel}
        plano="elite"
      />
      <GarantiaModal
        open={configGarantia}
        onOpenChange={setConfigGarantia}
        imovel={imovel}
      />
    </div>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: React.ReactNode
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-500 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-slate-900 text-right truncate">{value}</span>
    </div>
  )
}

function ConfigItem({ titulo, descricao, onClick }: { titulo: string; descricao: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">{titulo}</p>
        <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
    </button>
  )
}
