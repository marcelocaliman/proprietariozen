'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Zap, X, ExternalLink, AlertTriangle, Loader2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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

interface Props { plano: PlanoTipo }

export function AbaAssinatura({ plano }: Props) {
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
            {/* Header gradiente */}
            <div
              className="px-6 py-5 relative overflow-hidden text-white"
              style={{
                background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.2)', filter: 'blur(40px)', transform: 'translate(40%, -40%)' }} />
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
              style={{
                background: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 50%, #7C3AED 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'rgba(196, 181, 253, 0.25)', filter: 'blur(40px)', transform: 'translate(40%, -40%)' }} />
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

  // ── Plano Master ativo ───────────────────────────────────────────────────────
  if (plano === 'pago') {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Plano Master ativo</p>
                  <p className="text-sm text-[#475569] mt-0.5">Todos os recursos Master estão disponíveis.</p>
                </div>
              </div>
              <Badge className="bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] font-semibold">Master</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade para Elite */}
        <Card className="border-purple-200 bg-purple-50/40">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <Star className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-purple-900">Faça upgrade para o Elite</p>
                  <p className="text-sm text-[#475569] mt-0.5">
                    10 imóveis, inquilinos ilimitados, cobrança automática e suporte prioritário.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 bg-purple-600 hover:bg-purple-700 gap-1.5"
                onClick={() => handleAssinar('elite')}
                disabled={loadingElite}
              >
                {loadingElite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                Upgrade Elite
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhes da assinatura</CardTitle>
            <CardDescription>Gerencie seu plano e método de pagamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[#475569]">Valor mensal</span>
              <span className="text-sm font-medium">R$ 49,90/mês</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[#475569]">Próxima cobrança e faturas</span>
              <Button variant="link" size="sm" className="h-auto p-0 text-sm text-emerald-600" onClick={handlePortal} disabled={loadingPortal}>
                Ver no Stripe
              </Button>
            </div>
            <Separator />
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="gap-2" onClick={handlePortal} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Gerenciar assinatura
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setCancelarOpen(true)}
                disabled={loadingPortal}
              >
                Cancelar assinatura
              </Button>
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
                  Você perderá acesso ao plano Master <strong>no final do período pago</strong>.
                  Seus dados ficam preservados mas recursos exclusivos serão desativados.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setCancelarOpen(false)}>Manter Master</Button>
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

  // ── Plano Elite ativo ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Star className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Plano Elite ativo</p>
                <p className="text-sm text-[#475569] mt-0.5">Todos os recursos, sem limites.</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 font-semibold">Elite</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhes da assinatura</CardTitle>
          <CardDescription>Gerencie seu plano e método de pagamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-[#475569]">Valor mensal</span>
            <span className="text-sm font-medium">R$ 99,90/mês</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-[#475569]">Próxima cobrança e faturas</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-sm text-purple-600" onClick={handlePortal} disabled={loadingPortal}>
              Ver no Stripe
            </Button>
          </div>
          <Separator />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="gap-2" onClick={handlePortal} disabled={loadingPortal}>
              {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gerenciar assinatura
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setCancelarOpen(true)}
              disabled={loadingPortal}
            >
              Cancelar assinatura
            </Button>
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
                Você perderá acesso ao plano Elite <strong>no final do período pago</strong>.
                Seus dados ficam preservados mas recursos exclusivos serão desativados.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelarOpen(false)}>Manter Elite</Button>
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
