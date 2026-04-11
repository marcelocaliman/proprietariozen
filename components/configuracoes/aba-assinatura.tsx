'use client'

import { useState } from 'react'
import { Check, Zap, X, ExternalLink, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// TODO (Semana 3): importar utilitários do Stripe
// import { criarCheckoutSession, criarPortalSession } from '@/lib/stripe'

interface Props {
  plano: 'gratis' | 'pago'
}

const recursosGratis = [
  { label: '1 imóvel cadastrado', ok: true },
  { label: 'Controle de inquilinos', ok: true },
  { label: 'Histórico de aluguéis', ok: true },
  { label: 'Recibos PDF', ok: false },
  { label: 'Alertas por e-mail', ok: false },
  { label: 'Reajuste automático', ok: false },
  { label: 'Imóveis ilimitados', ok: false },
  { label: 'Suporte prioritário', ok: false },
]

const recursosPro = [
  { label: 'Imóveis ilimitados', ok: true },
  { label: 'Controle de inquilinos', ok: true },
  { label: 'Histórico de aluguéis', ok: true },
  { label: 'Recibos PDF ilimitados', ok: true },
  { label: 'Alertas por e-mail', ok: true },
  { label: 'Reajuste automático (IGPM/IPCA)', ok: true },
  { label: 'Relatórios e exportação', ok: true },
  { label: 'Suporte prioritário', ok: true },
]

function RecursoItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground line-through'}>{label}</span>
    </li>
  )
}

function BotaoEmBreve({ children, variant = 'default' }: {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'destructive'
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant={variant} disabled className="cursor-not-allowed opacity-60">
              {children}
            </Button>
          }
        />
        <TooltipContent>Em breve</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function AbaAssinatura({ plano }: Props) {
  const [cancelarOpen, setCancelarOpen] = useState(false)

  // TODO (Semana 3): buscar dados reais da assinatura Stripe
  // const proximaCobranca = '15/05/2025'
  // const valorProximaCobranca = 'R$ 29,90'

  if (plano === 'gratis') {
    return (
      <div className="space-y-6">
        {/* Banner limitações */}
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="pt-5">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Você está no plano Grátis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Limitado a 1 imóvel, sem geração de recibos PDF, sem alertas automáticos
                  por e-mail e sem reajuste automático.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparação de planos */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Plano Grátis */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Grátis</CardTitle>
                <Badge variant="outline">Atual</Badge>
              </div>
              <p className="text-2xl font-bold">R$ 0<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recursosGratis.map(r => <RecursoItem key={r.label} {...r} />)}
              </ul>
            </CardContent>
          </Card>

          {/* Plano Pro */}
          <Card className="border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-purple-600 hover:bg-purple-600 px-3">
                <Zap className="h-3 w-3 mr-1" />
                Recomendado
              </Badge>
            </div>
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-base">Pro</CardTitle>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recursosPro.map(r => <RecursoItem key={r.label} {...r} />)}
              </ul>
              <div className="mt-5">
                {/* TODO (Semana 3): substituir pelo botão real que chama criarCheckoutSession() */}
                <BotaoEmBreve>
                  <Zap className="h-4 w-4 mr-2" />
                  Fazer upgrade para Pro
                </BotaoEmBreve>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Plano Pro ativo ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Status Pro */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Plano Pro ativo</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Todos os recursos estão disponíveis.
                </p>
              </div>
            </div>
            <Badge className="bg-purple-600 hover:bg-purple-600">Pro</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes da assinatura */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhes da assinatura</CardTitle>
          <CardDescription>
            Gerencie seu plano e método de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Próxima cobrança</span>
            {/* TODO (Semana 3): exibir data real da Stripe */}
            <span className="text-sm font-medium">—</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Valor</span>
            {/* TODO (Semana 3): exibir valor real da Stripe */}
            <span className="text-sm font-medium">R$ 29,90/mês</span>
          </div>
          <Separator />
          <div className="flex gap-3 pt-2">
            {/* TODO (Semana 3): substituir pelo portal real da Stripe */}
            <BotaoEmBreve variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Gerenciar assinatura
            </BotaoEmBreve>
            <BotaoEmBreve variant="outline">
              Cancelar assinatura
            </BotaoEmBreve>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de faturas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO (Semana 3): listar faturas reais da Stripe */}
          <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
            <p className="text-sm">Histórico de faturas disponível em breve.</p>
          </div>
        </CardContent>
      </Card>

      {/* Modal cancelamento */}
      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancelar assinatura?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive font-medium">Atenção</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você perderá acesso ao plano Pro no final do período pago.
                Seus dados serão mantidos, mas recursos exclusivos do Pro
                serão desativados.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelarOpen(false)}>
                Manter Pro
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  // TODO (Semana 3): chamar API de cancelamento da Stripe
                  toast.info('Em breve')
                  setCancelarOpen(false)
                }}
              >
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
