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
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Você está no plano Grátis</p>
                <p className="text-sm text-[#475569] mt-1">
                  Limitado a 1 imóvel. Sem recibos PDF, sem alertas automáticos e sem reajuste.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card Master */}
          <Card className="border-2 border-emerald-500 bg-emerald-50/50">
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-emerald-700">Master</CardTitle>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                  <Zap className="h-3 w-3 mr-1" />Recomendado
                </Badge>
              </div>
              <p className="text-2xl font-bold text-emerald-700">
                R$ 49,90<span className="text-sm font-normal text-[#94A3B8]">/mês</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5">
                <RecursoItem ok={true}>3 imóveis · 3 inquilinos</RecursoItem>
                <RecursoItem ok={true}>500 MB de armazenamento</RecursoItem>
                <RecursoItem ok={true}>Recibos PDF</RecursoItem>
                <RecursoItem ok={true}>Alertas por e-mail</RecursoItem>
                <RecursoItem ok={true}>Reajuste automático (IGPM/IPCA)</RecursoItem>
                <RecursoItem ok={false}>Cobrança automática</RecursoItem>
                <RecursoItem ok={false}>Suporte prioritário</RecursoItem>
              </ul>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={() => handleAssinar('pago')}
                disabled={loadingMaster}
              >
                {loadingMaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Assinar Master — R$ 49,90/mês
              </Button>
            </CardContent>
          </Card>

          {/* Card Elite */}
          <Card className="border-2 border-purple-500 bg-purple-50/30">
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-purple-700">Elite</CardTitle>
                <Badge className="bg-purple-600 hover:bg-purple-600 text-white">
                  <Star className="h-3 w-3 mr-1" />Premium
                </Badge>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                R$ 99,90<span className="text-sm font-normal text-[#94A3B8]">/mês</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5">
                <RecursoItem ok={true}>10 imóveis · ilimitado inquilinos</RecursoItem>
                <RecursoItem ok={true}>5 GB de armazenamento</RecursoItem>
                <RecursoItem ok={true}>Recibos PDF</RecursoItem>
                <RecursoItem ok={true}>Alertas por e-mail</RecursoItem>
                <RecursoItem ok={true}>Reajuste automático (IGPM/IPCA)</RecursoItem>
                <RecursoItem ok={true}>Cobrança automática</RecursoItem>
                <RecursoItem ok={true}>Suporte prioritário</RecursoItem>
              </ul>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                onClick={() => handleAssinar('elite')}
                disabled={loadingElite}
              >
                {loadingElite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                Assinar Elite — R$ 99,90/mês
              </Button>
            </CardContent>
          </Card>
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
