import Link from 'next/link'
import { Lock } from 'lucide-react'

interface BloqueioPlanoProps {
  titulo: string
  descricao: string
  planoCta?: string  // ex: "Elite"
  href?: string
}

export function BloqueioPlano({
  titulo,
  descricao,
  planoCta = 'Elite',
  href = '/planos',
}: BloqueioPlanoProps) {
  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 p-10 flex flex-col items-center gap-5 text-center max-w-md mx-auto mt-12">
      <div className="p-3 rounded-full bg-purple-100">
        <Lock className="h-7 w-7 text-purple-500" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold text-slate-800 text-lg">{titulo}</p>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">{descricao}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-6 py-2.5 transition-colors"
      >
        Fazer upgrade para o {planoCta}
      </Link>
    </div>
  )
}
