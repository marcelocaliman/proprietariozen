'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Check, X, Zap, Building2, FileText, TrendingUp,
  BarChart3, Mail, Shield, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface RecursoProps {
  ok: boolean
  children: React.ReactNode
}

function Recurso({ ok, children }: RecursoProps) {
  return (
    <li className="flex items-center gap-3 text-sm py-1">
      {ok
        ? <Check className="h-4 w-4 shrink-0 text-green-500" />
        : <X className="h-4 w-4 shrink-0 text-muted-foreground/30" />}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground line-through'}>
        {children}
      </span>
    </li>
  )
}

interface Props {
  planoAtual: 'gratis' | 'pago'
}

export function PlanosClient({ planoAtual }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleAssinar() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Erro ao iniciar pagamento')
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Erro ao conectar com o servidor de pagamento')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Erro ao abrir portal')
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Escolha seu plano</h1>
        <p className="text-muted-foreground">
          Comece grátis e faça upgrade quando precisar de mais recursos.
        </p>
      </div>

      {/* Cards dos planos */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Plano Grátis */}
        <Card className={`relative flex flex-col ${planoAtual === 'gratis' ? 'border-primary ring-2 ring-primary/20' : ''}`}>
          {planoAtual === 'gratis' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="default" className="px-3">Plano atual</Badge>
            </div>
          )}
          <CardHeader className="pt-7 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grátis</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground">Para começar a organizar seus imóveis</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-5">
            <ul className="space-y-0.5">
              <Recurso ok={true}><Building2 className="h-3.5 w-3.5 inline mr-1" />1 imóvel cadastrado</Recurso>
              <Recurso ok={true}>Controle de inquilinos</Recurso>
              <Recurso ok={true}>Histórico de aluguéis</Recurso>
              <Recurso ok={true}>Dashboard com resumo</Recurso>
              <Recurso ok={false}><FileText className="h-3.5 w-3.5 inline mr-1" />Recibos PDF ilimitados</Recurso>
              <Recurso ok={false}><TrendingUp className="h-3.5 w-3.5 inline mr-1" />Reajuste automático</Recurso>
              <Recurso ok={false}><BarChart3 className="h-3.5 w-3.5 inline mr-1" />Relatórios mensais</Recurso>
              <Recurso ok={false}><Mail className="h-3.5 w-3.5 inline mr-1" />Alertas por e-mail</Recurso>
            </ul>
            <div className="mt-auto">
              {planoAtual === 'gratis' ? (
                <Button variant="outline" className="w-full" disabled>Plano atual</Button>
              ) : (
                <Button variant="outline" className="w-full" onClick={handlePortal} disabled={loading}>
                  Gerenciar no Stripe
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plano Pro */}
        <Card className={`relative flex flex-col border-purple-300 bg-gradient-to-b from-purple-50/80 to-background dark:from-purple-950/30 dark:border-purple-800 ${planoAtual === 'pago' ? 'ring-2 ring-purple-400/40' : ''}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            {planoAtual === 'pago' ? (
              <Badge className="bg-green-600 hover:bg-green-600 px-3">
                <Check className="h-3 w-3 mr-1" />Ativo
              </Badge>
            ) : (
              <Badge className="bg-purple-600 hover:bg-purple-600 px-3">
                <Zap className="h-3 w-3 mr-1" />Recomendado
              </Badge>
            )}
          </div>
          <CardHeader className="pt-7 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-purple-700 dark:text-purple-300">R$ 29,90</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground">Gestão completa de imóveis e inquilinos</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-5">
            <ul className="space-y-0.5">
              <Recurso ok={true}><Building2 className="h-3.5 w-3.5 inline mr-1" />Até 5 imóveis</Recurso>
              <Recurso ok={true}>Controle de inquilinos</Recurso>
              <Recurso ok={true}>Histórico de aluguéis</Recurso>
              <Recurso ok={true}>Dashboard com resumo</Recurso>
              <Recurso ok={true}><FileText className="h-3.5 w-3.5 inline mr-1" />Recibos PDF ilimitados</Recurso>
              <Recurso ok={true}><TrendingUp className="h-3.5 w-3.5 inline mr-1" />Reajuste automático (IGPM/IPCA)</Recurso>
              <Recurso ok={true}><BarChart3 className="h-3.5 w-3.5 inline mr-1" />Relatórios mensais</Recurso>
              <Recurso ok={true}><Mail className="h-3.5 w-3.5 inline mr-1" />Alertas por e-mail</Recurso>
            </ul>
            <div className="mt-auto">
              {planoAtual === 'pago' ? (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handlePortal}
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Gerenciar assinatura
                </Button>
              ) : (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                  onClick={handleAssinar}
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Zap className="h-4 w-4" />}
                  Assinar Pro — R$ 29,90/mês
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ / garantias */}
      <Separator />
      <div className="grid gap-4 sm:grid-cols-3 text-center">
        <div className="space-y-1">
          <Shield className="h-5 w-5 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Cancele quando quiser</p>
          <p className="text-xs text-muted-foreground">Sem fidelidade. Cancele a qualquer momento.</p>
        </div>
        <div className="space-y-1">
          <Check className="h-5 w-5 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Pagamento seguro</p>
          <p className="text-xs text-muted-foreground">Processado pela Stripe com criptografia SSL.</p>
        </div>
        <div className="space-y-1">
          <Zap className="h-5 w-5 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Ativação imediata</p>
          <p className="text-xs text-muted-foreground">Acesso Pro liberado na confirmação do pagamento.</p>
        </div>
      </div>
    </div>
  )
}
