'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Zap, X, ExternalLink, AlertTriangle, Loader2, Star, Calendar, CreditCard, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { PlanoTipo } from '@/lib/stripe'

interface RecursoItemProps { ok: boolean; children: React.ReactNode }

function RecursoItem({ ok, children }: RecursoItemProps) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok
        ? <Check className="h-4 w-4 shrink-0 text-emerald-500" />
        : <X className="h-4 w-4 shrink-0 text-[#94A3B8]" />}
      <span className={ok ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>{children}</span>
    </li>
  )
}

interface Props {
  plano: PlanoTipo
  subscriptionStatus?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}

const PLANO_THEME = {
  pago: {
    label: 'Master',
    valor: 'R$ 49,90',
    valorCentavos: 4990,
    gradient: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
    glow: 'rgba(110, 231, 183, 0.20)',
    glowSecondary: 'rgba(52, 211, 153, 0.10)',
    boxShadow: '0 8px 32px rgba(5, 150, 105, 0.20)',
    primaryColor: '#059669',
    accentText: '#A7F3D0',
    accentLight: '#D1FAE5',
    portalLinkColor: 'text-emerald-600',
  },
  elite: {
    label: 'Elite',
    valor: 'R$ 99,90',
    valorCentavos: 9990,
    gradient: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 50%, #7C3AED 100%)',
    glow: 'rgba(196, 181, 253, 0.25)',
    glowSecondary: 'rgba(167, 139, 250, 0.12)',
    boxShadow: '0 8px 32px rgba(124, 58, 237, 0.22)',
    primaryColor: '#7C3AED',
    accentText: '#DDD6FE',
    accentLight: '#EDE9FE',
    portalLinkColor: 'text-purple-600',
  },
} as const

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function AbaAssinatura({ plano, subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd }: Props) {
  const [loadingMaster,  setLoadingMaster]  = useState(false)
  const [loadingElite,   setLoadingElite]   = useState(false)
  const [loadingPortal,  setLoadingPortal]  = useState(false)
  const [cancelarOpen,   setCancelarOpen]   = useState(false)

  async function handleAssinar(planoPretendido: 'pago' | 'elite') {
    const setLoading = planoPretendido === 'elite' ? setLoadingElite : setLoadingMaster
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: planoPretendido }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao iniciar pagamento'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor de pagamento') }
    finally { setLoading(false) }
  }

  async function handlePortal() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao abrir portal'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor') }
    finally { setLoadingPortal(false) }
  }

  // ── Plano Grátis ────────────────────────────────────────────────────────────
  if (plano === 'gratis') {
    return (
      <div className="space-y-6">
        {/* Banner do plano atual — gradiente âmbar com hierarquia clara */}
        <div
          className="rounded-2xl p-6 sm:p-7 relative overflow-hidden border shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            borderColor: '#FCD34D',
          }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'rgba(251, 191, 36, 0.20)', filter: 'blur(60px)', transform: 'translate(30%, -30%)' }} />
          <div className="relative z-10 flex items-start gap-4 min-w-0 flex-1">
            <div className="shrink-0 h-12 w-12 rounded-xl bg-amber-200 border border-amber-300 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700/80">Plano atual</p>
              <h3 className="text-lg font-extrabold text-amber-900 mt-0.5 tracking-tight">Você está no plano Grátis</h3>
              <p className="text-sm text-amber-800/90 mt-1 leading-relaxed">
                Limitado a <strong>1 imóvel</strong>. Sem recibos PDF, alertas automáticos ou reajuste por índice.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Card Master */}
          <div className="relative rounded-2xl border-2 border-emerald-300 bg-white shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div
              className="px-6 py-5 relative overflow-hidden text-white"
              style={{ background: PLANO_THEME.pago.gradient }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: PLANO_THEME.pago.glow, filter: 'blur(40px)', transform: 'translate(40%, -40%)' }} />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/80">Master</p>
                  <p className="font-extrabold leading-none mt-2" style={{ fontSize: 'clamp(28px, 3vw, 36px)', letterSpacing: '-0.02em' }}>
                    R$ 49,90
                    <span className="text-sm font-medium text-emerald-200/80 ml-1">/mês</span>
                  </p>
                </div>
                <Badge className="bg-white/15 hover:bg-white/15 text-white border-white/30 backdrop-blur-sm shrink-0">
                  <Zap className="h-3 w-3 mr-1" />Recomendado
                </Badge>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-5">
              <ul className="space-y-2.5">
                <RecursoItem ok={true}>3 imóveis · 3 inquilinos</RecursoItem>
                <RecursoItem ok={true}>500 MB de armazenamento</RecursoItem>
                <RecursoItem ok={true}>Recibos PDF</RecursoItem>
                <RecursoItem ok={true}>Alertas por e-mail</RecursoItem>
                <RecursoItem ok={true}>Reajuste automático (IGPM/IPCA)</RecursoItem>
                <RecursoItem ok={false}>Cobrança automática</RecursoItem>
                <RecursoItem ok={false}>Suporte prioritário</RecursoItem>
              </ul>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-11 text-sm font-semibold mt-auto"
                onClick={() => handleAssinar('pago')}
                disabled={loadingMaster}
              >
                {loadingMaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Assinar Master
              </Button>
            </div>
          </div>

          {/* Card Elite */}
          <div className="relative rounded-2xl border-2 border-purple-300 bg-white shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div
              className="px-6 py-5 relative overflow-hidden text-white"
              style={{ background: PLANO_THEME.elite.gradient }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: PLANO_THEME.elite.glow, filter: 'blur(40px)', transform: 'translate(40%, -40%)' }} />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200/80">Elite</p>
                  <p className="font-extrabold leading-none mt-2" style={{ fontSize: 'clamp(28px, 3vw, 36px)', letterSpacing: '-0.02em' }}>
                    R$ 99,90
                    <span className="text-sm font-medium text-purple-200/80 ml-1">/mês</span>
                  </p>
                </div>
                <Badge className="bg-white/15 hover:bg-white/15 text-white border-white/30 backdrop-blur-sm shrink-0">
                  <Star className="h-3 w-3 mr-1" />Premium
                </Badge>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-5">
              <ul className="space-y-2.5">
                <RecursoItem ok={true}>10 imóveis · ilimitado inquilinos</RecursoItem>
                <RecursoItem ok={true}>5 GB de armazenamento</RecursoItem>
                <RecursoItem ok={true}>Recibos PDF</RecursoItem>
                <RecursoItem ok={true}>Alertas por e-mail</RecursoItem>
                <RecursoItem ok={true}>Reajuste automático (IGPM/IPCA)</RecursoItem>
                <RecursoItem ok={true}>Cobrança automática</RecursoItem>
                <RecursoItem ok={true}>Suporte prioritário</RecursoItem>
              </ul>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 gap-2 h-11 text-sm font-semibold mt-auto"
                onClick={() => handleAssinar('elite')}
                disabled={loadingElite}
              >
                {loadingElite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                Assinar Elite
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Plano Master ou Elite ativo ─────────────────────────────────────────────
  const theme = PLANO_THEME[plano]
  const isElite = plano === 'elite'
  const willCancel = cancelAtPeriodEnd === true

  return (
    <div className="space-y-6">
      {/* ── Hero do plano ativo ── */}
      <div
        className="rounded-2xl p-7 sm:p-8 relative overflow-hidden text-white flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        style={{ background: theme.gradient, boxShadow: theme.boxShadow }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: theme.glow, filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: theme.glowSecondary, filter: 'blur(60px)' }} />

        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: theme.accentText }}>Plano ativo</p>
            {willCancel && (
              <Badge className="bg-amber-500/90 hover:bg-amber-500/90 text-white border-0 text-[10px] font-bold">
                Cancela ao fim do período
              </Badge>
            )}
          </div>
          <h2
            className="font-extrabold leading-none mt-2"
            style={{
              fontSize: 'clamp(40px, 5vw, 56px)',
              background: 'linear-gradient(135deg, #FFFFFF 0%, ' + theme.accentText + ' 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
            }}
          >
            {theme.label}
          </h2>
          <p className="font-bold mt-3 leading-none" style={{ fontSize: 'clamp(20px, 2vw, 26px)' }}>
            {theme.valor}
            <span className="text-sm font-medium opacity-70 ml-1">/mês</span>
          </p>
        </div>

        {currentPeriodEnd && (
          <div className="relative z-10 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 sm:max-w-xs">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 opacity-70" />
              <p className="text-[10px] uppercase tracking-widest font-semibold opacity-70">
                {willCancel ? 'Acesso até' : 'Próxima cobrança'}
              </p>
            </div>
            <p className="text-sm font-bold leading-tight">{formatDate(currentPeriodEnd)}</p>
            {subscriptionStatus && subscriptionStatus !== 'active' && (
              <p className="text-[11px] mt-1 capitalize" style={{ color: theme.accentText }}>
                Status: {subscriptionStatus}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Upgrade para Elite (só aparece se Master) ── */}
      {!isElite && (
        <div className="rounded-2xl border border-purple-200 overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-purple-50 to-white p-5 sm:p-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0 h-11 w-11 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
              <Star className="h-5 w-5 text-purple-700" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700/80">Próximo passo</p>
              <h3 className="text-base font-bold text-purple-900 mt-0.5 tracking-tight">Faça upgrade para o Elite</h3>
              <p className="text-xs text-purple-800/80 mt-1 leading-relaxed">
                10 imóveis, inquilinos ilimitados, cobrança automática Pix + boleto e suporte prioritário.
              </p>
            </div>
          </div>
          <Button
            className="shrink-0 bg-purple-600 hover:bg-purple-700 gap-1.5 h-10 px-5 text-sm font-semibold"
            onClick={() => handleAssinar('elite')}
            disabled={loadingElite}
          >
            {loadingElite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            Upgrade Elite — R$ 99,90/mês
          </Button>
        </div>
      )}

      {/* ── Detalhes da assinatura ── */}
      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Detalhes da assinatura</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gerencie seu plano e método de pagamento via Stripe.</p>
          </div>

          <div className="divide-y divide-slate-100">
            <DetalheRow
              icon={CreditCard}
              label="Valor mensal"
              value={`${theme.valor}/mês`}
            />
            <DetalheRow
              icon={Calendar}
              label={willCancel ? 'Acesso até' : 'Próxima cobrança'}
              value={formatDate(currentPeriodEnd)}
            />
            <DetalheRow
              icon={ShieldCheck}
              label="Status da assinatura"
              value={
                <Badge
                  className={
                    subscriptionStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                      : subscriptionStatus === 'trialing'
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                  }
                >
                  {subscriptionStatus === 'active' ? 'Ativa'
                    : subscriptionStatus === 'trialing' ? 'Trial'
                    : subscriptionStatus ?? 'desconhecido'}
                </Badge>
              }
            />
          </div>

          <div className="px-6 py-5 bg-slate-50/40 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={handlePortal} disabled={loadingPortal}>
              {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gerenciar no Stripe
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive border-red-200 hover:bg-red-50"
              onClick={() => setCancelarOpen(true)}
              disabled={loadingPortal}
            >
              Cancelar assinatura
            </Button>
            <span className="text-xs text-slate-400 ml-auto">
              Faturas, histórico e método de pagamento ficam no portal do Stripe.
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancelar assinatura?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive font-medium">Atenção</p>
              <p className="text-sm text-[#475569] mt-1">
                Você perderá acesso ao plano <strong>{theme.label}</strong> no final do período pago
                ({formatDate(currentPeriodEnd)}). Seus dados ficam preservados, mas recursos exclusivos serão desativados.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelarOpen(false)}>Manter {theme.label}</Button>
              <Button
                variant="destructive"
                disabled={loadingPortal}
                onClick={async () => { setCancelarOpen(false); await handlePortal() }}
              >
                Ir para cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetalheRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-600 font-medium">{label}</span>
      </div>
      <div className="text-sm font-semibold text-slate-900 text-right">
        {value}
      </div>
    </div>
  )
}
