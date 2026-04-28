'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  User, IdCard, Phone, Mail, Building2, CalendarDays,
  CheckCircle2, AlertCircle, Send, Pencil, Banknote,
  ArrowRight, Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InquilinoModal } from '@/components/inquilinos/inquilino-modal'
import { formatarMoeda, formatarData, formatarTelefone } from '@/lib/helpers'
import type { Inquilino } from '@/types'
import { cn } from '@/lib/utils'

const statusBadge: Record<string, string> = {
  pago: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-amber-100 text-amber-700',
  atrasado: 'bg-red-100 text-red-700',
  cancelado: 'bg-slate-100 text-slate-600',
  estornado: 'bg-slate-100 text-slate-600',
}
const statusLabel: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado',
  cancelado: 'Cancelado', estornado: 'Estornado',
}

type Aluguel = {
  id: string; valor: number; status: string; mes_referencia: string
  data_vencimento: string; data_pagamento: string | null
  valor_pago: number | null; asaas_charge_id: string | null
  lembrete_enviado_em: string | null
}

type InquilinoDetalhado = {
  id: string; nome: string; cpf: string | null; telefone: string | null
  email: string | null; ativo: boolean; criado_em: string
  convite_enviado_em: string | null; asaas_customer_id: string | null
  imovel_id: string
  imovel: {
    id: string; apelido: string; endereco: string; tipo: string
    valor_aluguel: number; dia_vencimento: number
    billing_mode: 'MANUAL' | 'AUTOMATIC' | null
    data_inicio_contrato: string | null
    data_fim_contrato: string | null
    contrato_indeterminado: boolean
    vigencia_meses: number | null
    iptu_mensal: number; condominio_mensal: number
    outros_encargos: number; outros_encargos_descricao: string | null
  } | null
}

function formatarCpf(cpf: string | null): string {
  if (!cpf) return ''
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
}

function formatarMes(ref: string): string {
  const [ano, mes] = ref.split('-').map(Number)
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function diasAte(data: string): number {
  const alvo = new Date(data + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function iniciaisNome(nome: string): string {
  return nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

interface Props {
  inquilino: InquilinoDetalhado
  alugueis: Aluguel[]
}

export function InquilinoDetalheClient({ inquilino, alugueis }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [convidando, setConvidando] = useState(false)

  const imovel = inquilino.imovel

  // Stats
  const ano = new Date().getFullYear()
  const alugueisDoAno = alugueis.filter(a => a.mes_referencia.startsWith(String(ano)))
  const totalPago = alugueisDoAno.filter(a => a.status === 'pago')
    .reduce((s, a) => s + (a.valor_pago ?? a.valor), 0)
  const totalEsperado = alugueisDoAno
    .filter(a => a.status !== 'cancelado' && a.status !== 'estornado')
    .reduce((s, a) => s + a.valor, 0)

  const adimplencia = useMemo(() => {
    const computaveis = alugueis.filter(a =>
      a.status !== 'cancelado' && a.status !== 'estornado' && a.status !== 'pendente',
    )
    if (!computaveis.length) return null
    const pagos = computaveis.filter(a => a.status === 'pago').length
    return Math.round((pagos / computaveis.length) * 100)
  }, [alugueis])

  // Pontualidade média (dias antes/depois do vencimento)
  const pontualidade = useMemo(() => {
    const pagos = alugueis.filter(a => a.status === 'pago' && a.data_pagamento)
    if (!pagos.length) return null
    const totalDias = pagos.reduce((s, a) => {
      const venc = new Date(a.data_vencimento + 'T00:00:00')
      const pago = new Date(a.data_pagamento! + 'T00:00:00')
      return s + Math.round((pago.getTime() - venc.getTime()) / 86_400_000)
    }, 0)
    return Math.round(totalDias / pagos.length)
  }, [alugueis])

  const valorMensal = imovel
    ? imovel.valor_aluguel + (imovel.iptu_mensal ?? 0) + (imovel.condominio_mensal ?? 0) + (imovel.outros_encargos ?? 0)
    : 0

  async function handleEnviarConvite() {
    if (!inquilino.email) {
      toast.error('Inquilino sem e-mail cadastrado')
      return
    }
    setConvidando(true)
    try {
      const res = await fetch('/api/inquilino/enviar-convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquilinoId: inquilino.id }),
      })
      const data = await res.json() as { error?: string; link?: string; enviado_para?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao enviar convite')
        return
      }
      toast.success('Convite enviado!', {
        description: `Para ${data.enviado_para}`,
        action: data.link ? {
          label: 'Copiar link',
          onClick: () => navigator.clipboard.writeText(data.link!),
        } : undefined,
      })
      router.refresh()
    } finally {
      setConvidando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shrink-0">
            {iniciaisNome(inquilino.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{inquilino.nome}</h1>
            <p className="text-sm text-slate-500 truncate">
              Inquilino desde {formatarData(inquilino.criado_em)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge className={cn(
                'text-[11px]',
                inquilino.ativo ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700',
              )}>
                {inquilino.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              {inquilino.convite_enviado_em && (
                <Badge variant="outline" className="text-[11px] gap-1">
                  <Mail className="h-3 w-3" />
                  Convite enviado
                </Badge>
              )}
              {imovel?.billing_mode && (
                <Badge variant="outline" className="text-[11px]">
                  {imovel.billing_mode === 'AUTOMATIC' ? 'Asaas' : 'Manual'}
                </Badge>
              )}
              {inquilino.cpf ? (
                <Badge variant="outline" className="text-[11px] gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  CPF cadastrado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] gap-1 text-red-600 border-red-200">
                  <AlertCircle className="h-3 w-3" />
                  CPF faltando
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditando(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          {inquilino.email && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleEnviarConvite}
              disabled={convidando}
            >
              <Mail className="h-3.5 w-3.5" />
              {inquilino.convite_enviado_em ? 'Reenviar convite' : 'Enviar convite'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Valor mensal</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatarMoeda(valorMensal)}</p>
            {imovel && valorMensal !== imovel.valor_aluguel && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                base + encargos
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pago em {ano}</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{formatarMoeda(totalPago)}</p>
            {totalEsperado > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                de {formatarMoeda(totalEsperado)}
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
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pontualidade</p>
            <p className={cn(
              'text-xl font-bold mt-1',
              pontualidade == null ? 'text-slate-400' :
              pontualidade <= 0 ? 'text-emerald-700' :
              pontualidade <= 3 ? 'text-amber-700' : 'text-red-700',
            )}>
              {pontualidade == null ? '—' :
               pontualidade < 0 ? `${Math.abs(pontualidade)}d antes` :
               pontualidade === 0 ? 'No prazo' :
               `${pontualidade}d depois`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 rounded-lg p-1 w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos ({alugueis.length})</TabsTrigger>
          <TabsTrigger value="acesso">Acesso</TabsTrigger>
        </TabsList>

        {/* ── Dados pessoais ── */}
        <TabsContent value="dados">
          <Card>
            <CardContent className="p-5 space-y-3">
              <Row
                icon={<User className="h-3.5 w-3.5 text-slate-400" />}
                label="Nome"
                value={inquilino.nome}
              />
              <Row
                icon={<IdCard className="h-3.5 w-3.5 text-slate-400" />}
                label="CPF"
                value={inquilino.cpf
                  ? <span className="font-mono">{formatarCpf(inquilino.cpf)}</span>
                  : imovel?.billing_mode === 'AUTOMATIC'
                    ? <span className="text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Necessário pro Asaas</span>
                    : <span className="text-slate-400">Não cadastrado</span>
                }
              />
              <Row
                icon={<Mail className="h-3.5 w-3.5 text-slate-400" />}
                label="E-mail"
                value={inquilino.email ?? <span className="text-slate-400">Não cadastrado</span>}
              />
              <Row
                icon={<Phone className="h-3.5 w-3.5 text-slate-400" />}
                label="Telefone"
                value={inquilino.telefone ? formatarTelefone(inquilino.telefone) : <span className="text-slate-400">Não cadastrado</span>}
              />
              {inquilino.asaas_customer_id && (
                <Row
                  icon={<Shield className="h-3.5 w-3.5 text-slate-400" />}
                  label="Asaas Customer ID"
                  value={<span className="font-mono text-xs text-slate-500">{inquilino.asaas_customer_id}</span>}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contrato ── */}
        <TabsContent value="contrato" className="space-y-4">
          {imovel ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    Imóvel alugado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{imovel.apelido}</p>
                      <p className="text-xs text-slate-500 truncate">{imovel.endereco}</p>
                    </div>
                    <Link
                      href={`/imoveis/${imovel.id}`}
                      className="text-xs text-emerald-600 hover:underline whitespace-nowrap"
                    >
                      Ver imóvel →
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    Vigência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm pt-0">
                  <Row label="Início" value={imovel.data_inicio_contrato ? formatarData(imovel.data_inicio_contrato) : '—'} />
                  <Row label="Fim" value={
                    imovel.contrato_indeterminado ? 'Indeterminado' :
                    imovel.data_fim_contrato ? formatarData(imovel.data_fim_contrato) : '—'
                  } />
                  {imovel.data_fim_contrato && !imovel.contrato_indeterminado && (() => {
                    const dias = diasAte(imovel.data_fim_contrato)
                    return (
                      <Row label="Tempo restante" value={
                        dias < 0 ? <span className="text-red-600">Vencido há {Math.abs(dias)}d</span> :
                        dias < 30 ? <span className="text-red-600">{dias} dias</span> :
                        dias < 60 ? <span className="text-amber-600">{dias} dias</span> :
                        `${Math.round(dias / 30)} meses`
                      } />
                    )
                  })()}
                  <Row label="Vigência total" value={imovel.vigencia_meses ? `${imovel.vigencia_meses} meses` : '—'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-slate-500" />
                    Valores mensais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm pt-0">
                  <Row label="Aluguel base" value={formatarMoeda(imovel.valor_aluguel)} />
                  {imovel.iptu_mensal > 0 && <Row label="IPTU" value={formatarMoeda(imovel.iptu_mensal)} />}
                  {imovel.condominio_mensal > 0 && <Row label="Condomínio" value={formatarMoeda(imovel.condominio_mensal)} />}
                  {imovel.outros_encargos > 0 && (
                    <Row
                      label={imovel.outros_encargos_descricao ?? 'Outros'}
                      value={formatarMoeda(imovel.outros_encargos)}
                    />
                  )}
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <Row
                      label={<span className="font-semibold">Total mensal</span>}
                      value={<span className="font-bold text-slate-900">{formatarMoeda(valorMensal)}</span>}
                    />
                  </div>
                  <Row label="Vencimento" value={`Dia ${imovel.dia_vencimento} de cada mês`} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-slate-500 text-sm">
                Sem imóvel vinculado.
              </CardContent>
            </Card>
          )}
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

        {/* ── Acesso ── */}
        <TabsContent value="acesso">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Portal do inquilino</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  O inquilino pode acessar uma área exclusiva sem criar conta — vê pagamentos,
                  documentos e dados do contrato.
                </p>
              </div>

              {inquilino.convite_enviado_em ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <p className="text-sm font-medium text-emerald-900">
                      Convite enviado em {formatarData(inquilino.convite_enviado_em)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEnviarConvite}
                      disabled={convidando || !inquilino.email}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Reenviar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-sm text-slate-700">Convite ainda não enviado</p>
                  {inquilino.email ? (
                    <Button
                      size="sm"
                      onClick={handleEnviarConvite}
                      disabled={convidando}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Enviar convite por e-mail
                    </Button>
                  ) : (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Cadastre o e-mail do inquilino antes de enviar o convite
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <InquilinoModal
        open={editando}
        onOpenChange={setEditando}
        inquilino={inquilino as unknown as Inquilino}
        imoveis={imovel ? [{ id: imovel.id, apelido: imovel.apelido }] : []}
      />
    </div>
  )
}

function Row({
  icon, label, value,
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
