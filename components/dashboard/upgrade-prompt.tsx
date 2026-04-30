import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'

type UpgradePromptProps = {
  variant: 'near_limit' | 'at_limit'
  imoveis: number
  limite: number
}

// Banner contextual de upgrade exibido no dashboard.
// Renderizar apenas para plano gratis e usuário NÃO admin (chamado decide).
export function UpgradePrompt({ variant, imoveis, limite }: UpgradePromptProps) {
  const isAtLimit = variant === 'at_limit'

  return (
    <div
      className="rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5 flex-wrap"
      style={{
        background: isAtLimit
          ? 'linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)'
          : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
        borderColor: isAtLimit ? '#FCD34D' : '#86EFAC',
      }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
            isAtLimit ? 'bg-amber-200' : 'bg-emerald-200'
          }`}
        >
          <Zap className={`h-5 w-5 ${isAtLimit ? 'text-amber-700' : 'text-emerald-700'}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${isAtLimit ? 'text-amber-900' : 'text-emerald-900'}`}>
            {isAtLimit
              ? `Você atingiu o limite do plano Grátis (${imoveis}/${limite} imóveis)`
              : `Você usou ${imoveis} de ${limite} imóveis do plano Grátis`}
          </p>
          <p
            className={`text-xs mt-0.5 leading-relaxed ${
              isAtLimit ? 'text-amber-800' : 'text-emerald-800/80'
            }`}
          >
            {isAtLimit
              ? 'Faça upgrade para Master e cadastre até 30 imóveis com cobrança automática Pix + boleto.'
              : 'Master desbloqueia 30 imóveis, cobrança automática Pix + boleto, alertas inteligentes e mais.'}
          </p>
        </div>
      </div>
      <Link
        href="/planos"
        className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          isAtLimit
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
      >
        Ver planos
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
