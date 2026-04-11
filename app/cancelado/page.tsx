import Link from 'next/link'
import { XCircle, ArrowLeft, Zap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function CanceladoPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícone */}
        <div className="flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Mensagem */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Pagamento cancelado</h1>
          <p className="text-muted-foreground">
            Nenhuma cobrança foi realizada. Você pode assinar o Pro quando quiser.
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <Link href="/planos" className={cn(buttonVariants(), 'gap-2 bg-purple-600 hover:bg-purple-700')}>
            <Zap className="h-4 w-4" />
            Ver planos
          </Link>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Você continua com o plano Grátis com acesso a 1 imóvel.
        </p>
      </div>
    </div>
  )
}
