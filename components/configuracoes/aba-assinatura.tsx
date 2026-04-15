'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Zap, X, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

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

const recursosGratis = [
  { label: '1 imóvel cadastrado', ok: true },
  { label: 'Controle de inquilinos', ok: true },
  { label: 'Histórico de aluguéis', ok: true },
  { label: 'Dashboard de resumo', ok: true },
  { label: 'Recibos PDF ilimitados', ok: false },
  { label: 'Alertas por e-mail', ok: false },
  { label: 'Reajuste automático (IGPM/IPCA)', ok: false },
  { label: 'Até 5 imóveis', ok: false },
]

const recursosPro = [
  { label: 'Até 5 imóveis cadastrados', ok: true },
  { label: 'Controle de inquilinos', ok: true },
  { label: 'Histórico de aluguéis', ok: true },
  { label: 'Dashboard de resumo', ok: true },
  { label: 'Recibos PDF ilimitados', ok: true },
  { label: 'Alertas por e-mail', ok: true },
  { label: 'Reajuste automático (IGPM/IPCA)', ok: true },
  { label: 'Suporte prioritário', ok: true },
]

interface Props { plano: 'gratis' | 'pago' }

export function AbaAssinatura({ plano }: Props) {
  const [loading, setLoading] = useState(false)
  const [cancelarOpen, setCancelarOpen] = useState(false)

  async function handleAssinar() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao iniciar pagamento'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor de pagamento') }
    finally { setLoading(false) }
  }

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao abrir portal'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor') }
    finally { setLoading(false) }
  }

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
          <Card className="border-dashed opacity-75">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Grátis</CardTitle>
                <Badge variant="outline">Plano atual</Badge>
              </div>
              <p className="text-2xl font-bold">R$ 0<span className="text-sm font-normal text-[#94A3B8]">/mês</span></p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {recursosGratis.map(r => <RecursoItem key={r.label} ok={r.ok}>{r.label}</RecursoItem>)}
              </ul>
            </CardContent>
          </Card>

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
                {recursosPro.map(r => <RecursoItem key={r.label} ok={r.ok}>{r.label}</RecursoItem>)}
              </ul>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={handleAssinar}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Assinar Master — R$ 49,90/mês
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Plano Master ativo</p>
                <p className="text-sm text-[#475569] mt-0.5">Todos os recursos estão disponíveis.</p>
              </div>
            </div>
            <Badge className="bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] font-semibold">Master</Badge>
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
            <Button variant="link" size="sm" className="h-auto p-0 text-sm text-emerald-600" onClick={handlePortal} disabled={loading}>
              Ver no Stripe
            </Button>
          </div>
          <Separator />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="gap-2" onClick={handlePortal} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gerenciar assinatura
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setCancelarOpen(true)}
              disabled={loading}
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
                Você perderá acesso ao plano Pro <strong>no final do período pago</strong>.
                Seus dados ficam preservados mas recursos exclusivos serão desativados.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelarOpen(false)}>Manter Pro</Button>
              <Button
                variant="destructive"
                disabled={loading}
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
