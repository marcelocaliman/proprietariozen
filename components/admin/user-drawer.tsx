'use client'

import { useState, useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Building2, Ban, RefreshCw, KeyRound,
  TrendingUp, Copy, CheckCircle2, AlertTriangle, ShieldOff,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type UserRow = {
  id: string
  nome: string
  email: string
  telefone: string | null
  plano: string
  role: string
  banned: boolean
  banned_at: string | null
  banned_reason: string | null
  criado_em: string
  atualizado_em: string
  total_imoveis: number
  total_inquilinos: number
  total_alugueis_mes: number
}

type UserDetail = {
  profile: UserRow & { stripe_customer_id: string | null }
  imoveis: { id: string; apelido: string; tipo: string; valor_aluguel: number; ativo: boolean }[]
  inquilinos: { id: string; nome: string; email: string; cpf: string | null; ativo: boolean }[]
  aluguel_history: { mes: string; label: string; total_valor: number; total_pago: number; count: number }[]
  recent_activity: { id: string; action: string; details: unknown; ip_address: string | null; created_at: string }[]
}

type DrawerProps = {
  user: UserRow | null
  open: boolean
  onClose: () => void
  onActionDone: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}
function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'medium' })
}
function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 2) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d}d`
  return fmtDate(iso)
}

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
]
function corAvatar(nome: string) {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = nome.charCodeAt(i) + ((h << 5) - h)
  return CORES_AVATAR[Math.abs(h) % CORES_AVATAR.length]
}
function initials(nome: string) {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-100', className)} />
}

// ── Tooltip do gráfico ────────────────────────────────────────────────────────
type TipProps = { active?: boolean; payload?: { value?: number }[]; label?: string }
function ChartTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[#475569] mb-1">{label}</p>
      <p className="text-emerald-600">Pago: <span className="font-bold text-[#0F172A]">{fmt(payload[0]?.value ?? 0)}</span></p>
      {payload[1] && (
        <p className="text-[#64748B]">Total: <span className="text-[#0F172A]">{fmt(payload[1]?.value ?? 0)}</span></p>
      )}
    </div>
  )
}

// ── Drawer ────────────────────────────────────────────────────────────────────

export function UserDrawer({ user, open, onClose, onActionDone }: DrawerProps) {
  const [detail, setDetail]       = useState<UserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [resetLink, setResetLink]   = useState<string | null>(null)

  // Buscar detalhe quando abre
  useEffect(() => {
    if (!open || !user) { setDetail(null); return }
    setLoadingDetail(true)
    fetch(`/api/admin/usuarios/${user.id}`)
      .then(r => r.json())
      .then(setDetail)
      .catch(() => toast.error('Erro ao carregar detalhes'))
      .finally(() => setLoadingDetail(false))
  }, [open, user])

  if (!user) return null

  const isPro    = user.plano === 'pago'
  const isBanned = user.banned

  // ── Executar ação ──────────────────────────────────────────────────────────
  async function executarAcao(acao: string, motivo?: string) {
    setActionLoading(acao)
    try {
      const res = await fetch(`/api/admin/usuarios/${user!.id}/acao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, motivo }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')

      if (acao === 'resetar_senha' && json.reset_link) {
        setResetLink(json.reset_link)
      } else {
        const msgs: Record<string, string> = {
          mudar_plano:   `Plano alterado para ${json.plano === 'pago' ? 'Pro' : 'Grátis'}`,
          banir:         'Usuário banido',
          reativar:      'Usuário reativado',
        }
        toast.success(msgs[acao] ?? 'Ação executada')
        onActionDone()
        onClose()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao executar ação')
    } finally {
      setActionLoading(null)
    }
  }

  function handleBanir() {
    const motivo = window.prompt('Motivo do banimento (opcional):') ?? undefined
    if (motivo === null) return // clicou cancelar
    executarAcao('banir', motivo || undefined)
  }

  async function copiarLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { onClose(); setResetLink(null) } }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#E2E8F0] shrink-0">
          <div className="flex items-center gap-3 pr-6">
            {isBanned ? (
              <div className="h-11 w-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <ShieldOff className="h-5 w-5 text-red-500" />
              </div>
            ) : (
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarFallback className={cn('text-sm font-bold', corAvatar(user.nome))}>
                  {initials(user.nome)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0">
              <SheetTitle className="text-base font-bold text-[#0F172A] truncate leading-tight">
                {user.nome}
              </SheetTitle>
              <p className="text-xs text-[#64748B] truncate mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <Badge className={cn(
              'text-[10px] font-semibold px-2',
              isPro
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-100 text-[#64748B] hover:bg-slate-100',
            )}>
              {isPro ? 'Pro' : 'Grátis'}
            </Badge>
            {isBanned && (
              <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100 px-2">
                Banido
              </Badge>
            )}
            {user.role === 'admin' && (
              <Badge className="text-[10px] bg-slate-800 text-white hover:bg-slate-800 px-2">
                Admin
              </Badge>
            )}
            <span className="text-[11px] text-[#94A3B8] ml-auto">
              Cadastro: {fmtDate(user.criado_em)}
            </span>
          </div>
        </SheetHeader>

        {/* ── Link de reset (quando gerado) ──────────────────────────────── */}
        {resetLink && (
          <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 shrink-0">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Link de recuperação gerado
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] bg-white border border-amber-200 rounded px-2 py-1 truncate text-[#475569]">
                {resetLink}
              </code>
              <button
                onClick={() => copiarLink(resetLink)}
                className="shrink-0 rounded p-1.5 bg-amber-100 hover:bg-amber-200 transition-colors"
              >
                {copiedLink
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  : <Copy className="h-3.5 w-3.5 text-amber-700" />}
              </button>
            </div>
            <p className="text-[10px] text-amber-600">
              Compartilhe apenas com o usuário. Expira em 1 hora.
            </p>
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs defaultValue="perfil" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="shrink-0 mx-5 mt-4 mb-0 w-auto justify-start bg-slate-100 rounded-lg">
            <TabsTrigger value="perfil"     className="text-xs px-3">Perfil</TabsTrigger>
            <TabsTrigger value="imoveis"    className="text-xs px-3">Imóveis</TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs px-3">Financeiro</TabsTrigger>
            <TabsTrigger value="logs"       className="text-xs px-3">Logs</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">

            {/* ── Tab: Perfil ──────────────────────────────────────────── */}
            <TabsContent value="perfil" className="px-5 py-4 space-y-4 outline-none">
              {loadingDetail ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <>
                  {/* Info */}
                  <div className="rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                    {[
                      { label: 'Nome',          value: user.nome },
                      { label: 'E-mail',         value: user.email },
                      { label: 'Telefone',       value: user.telefone ?? '—' },
                      { label: 'Cadastro',       value: fmtDate(user.criado_em) },
                      { label: 'Último acesso',  value: tempoRelativo(user.atualizado_em) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3">
                        <span className="text-xs text-[#94A3B8] font-medium">{label}</span>
                        <span className="text-xs text-[#0F172A] font-medium text-right max-w-[60%] truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status banimento */}
                  {isBanned && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-1">
                      <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Conta suspensa
                      </p>
                      {user.banned_at && (
                        <p className="text-xs text-red-600">Em: {fmtDt(user.banned_at)}</p>
                      )}
                      {user.banned_reason && (
                        <p className="text-xs text-red-600">Motivo: {user.banned_reason}</p>
                      )}
                    </div>
                  )}

                  {/* Ações */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Ações</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading || user.role === 'admin'}
                        onClick={() => executarAcao('mudar_plano')}
                        className="text-xs gap-1.5"
                      >
                        {actionLoading === 'mudar_plano'
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <TrendingUp className="h-3.5 w-3.5" />}
                        {isPro ? 'Mover p/ Grátis' : 'Mover p/ Pro'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading}
                        onClick={() => executarAcao('resetar_senha')}
                        className="text-xs gap-1.5"
                      >
                        {actionLoading === 'resetar_senha'
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <KeyRound className="h-3.5 w-3.5" />}
                        Resetar senha
                      </Button>
                    </div>
                    {isBanned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading}
                        onClick={() => executarAcao('reativar')}
                        className="w-full text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        {actionLoading === 'reativar'
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Reativar conta
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading || user.role === 'admin'}
                        onClick={handleBanir}
                        className="w-full text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        {actionLoading === 'banir'
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <Ban className="h-3.5 w-3.5" />}
                        Banir usuário
                      </Button>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Tab: Imóveis ─────────────────────────────────────────── */}
            <TabsContent value="imoveis" className="px-5 py-4 outline-none">
              {loadingDetail ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !detail?.imoveis.length ? (
                <div className="py-12 text-center">
                  <Building2 className="h-8 w-8 text-[#CBD5E1] mx-auto mb-2" />
                  <p className="text-sm text-[#94A3B8]">Nenhum imóvel cadastrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
                    {detail.imoveis.length} imóve{detail.imoveis.length !== 1 ? 'is' : 'l'} cadastrado{detail.imoveis.length !== 1 ? 's' : ''}
                  </p>
                  {detail.imoveis.map(im => (
                    <div key={im.id} className="rounded-xl border border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-[#64748B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">{im.apelido}</p>
                        <p className="text-xs text-[#94A3B8] capitalize">{im.tipo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-[#0F172A]">{fmt(im.valor_aluguel)}</p>
                        <Badge className={cn(
                          'text-[10px] mt-0.5',
                          im.ativo
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-[#64748B] hover:bg-slate-100',
                        )}>
                          {im.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Tab: Financeiro ─────────────────────────────────────── */}
            <TabsContent value="financeiro" className="px-5 py-4 space-y-4 outline-none">
              {loadingDetail ? (
                <div className="space-y-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-[180px]" />
                </div>
              ) : (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: 'MRR contribuído',
                        value: isPro ? fmt(29.90) : '—',
                        sub: isPro ? 'Plano Pro ativo' : 'Plano Grátis',
                      },
                      {
                        label: 'Receita 6 meses',
                        value: fmt(detail?.aluguel_history.reduce((s, m) => s + m.total_pago, 0) ?? 0),
                        sub: 'Aluguéis recebidos',
                      },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="rounded-xl border border-[#E2E8F0] px-4 py-3">
                        <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">{label}</p>
                        <p className="text-lg font-bold text-[#0F172A] mt-0.5 tabular-nums">{value}</p>
                        <p className="text-[11px] text-[#64748B]">{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Gráfico 6 meses */}
                  {detail && (
                    <div className="rounded-xl border border-[#E2E8F0] p-4">
                      <p className="text-xs font-semibold text-[#0F172A] mb-3">
                        Aluguéis — últimos 6 meses
                      </p>
                      {detail.aluguel_history.every(m => m.total_pago === 0) ? (
                        <div className="h-[140px] flex items-center justify-center text-sm text-[#94A3B8]">
                          Nenhum pagamento no período
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={detail.aluguel_history} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                            <XAxis
                              dataKey="label"
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="total_pago"  fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.9} />
                            <Bar dataKey="total_valor" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── Tab: Logs ──────────────────────────────────────────── */}
            <TabsContent value="logs" className="px-5 py-4 outline-none">
              {loadingDetail ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : !detail?.recent_activity.length ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[#94A3B8]">Nenhum log encontrado.</p>
                  <p className="text-xs text-[#CBD5E1] mt-1">
                    Aplique a migration <code>20260416_add_activity_logs.sql</code>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {detail.recent_activity.map((log: { id: string; action: string; details: unknown; ip_address: string | null; created_at: string }) => (
                    <div key={log.id} className="rounded-xl border border-[#E2E8F0] px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#0F172A]">{log.action}</p>
                        <span className="text-[10px] text-[#94A3B8] whitespace-nowrap shrink-0">
                          {tempoRelativo(log.created_at)}
                        </span>
                      </div>
                      {log.details != null && (
                        <p className="text-[11px] text-[#64748B] mt-1 font-mono break-all">
                          {typeof log.details === 'string'
                            ? log.details
                            : JSON.stringify(log.details as object).slice(0, 120)}
                        </p>
                      )}
                      {log.ip_address && (
                        <p className="text-[10px] text-[#CBD5E1] mt-1">IP: {log.ip_address}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
