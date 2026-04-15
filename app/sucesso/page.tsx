import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SucessoPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícone animado */}
        <div className="flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400/20" />
          </div>
        </div>

        {/* Mensagem */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Assinatura confirmada!</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao <span className="font-semibold text-purple-600">ProprietárioZen Master</span>.
            Seu acesso completo já está ativo.
          </p>
        </div>

        {/* O que foi liberado */}
        <div className="rounded-xl border bg-card p-5 text-left space-y-3">
          <p className="text-sm font-semibold">O que foi desbloqueado:</p>
          <ul className="text-sm text-muted-foreground space-y-2">
            {[
              'Até 5 imóveis cadastrados',
              'Geração de recibos PDF ilimitados',
              'Reajuste automático por IGPM e IPCA',
              'Relatórios mensais por e-mail',
              'Alertas de vencimento e atraso',
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Link href="/dashboard" className={cn(buttonVariants(), 'w-full gap-2')}>
          Ir para o painel
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="text-xs text-muted-foreground">
          Você receberá um e-mail de confirmação em breve.
          Para gerenciar sua assinatura, acesse{' '}
          <Link href="/configuracoes#assinatura" className="underline underline-offset-2">
            Configurações → Assinatura
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
