import { cn } from '@/lib/utils'
import { CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  titulo: string
  valor: string
  descricao?: string
  icon: LucideIcon
  cor?: 'padrao' | 'verde' | 'vermelho' | 'amarelo' | 'azul'
  todoEmDia?: boolean
  zeroText?: string
  tendencia?: { percentual: number; positivo: boolean } | null
}

const coresMap = {
  padrao:   { iconWrap: 'bg-emerald-500/15 text-emerald-600' },
  verde:    { iconWrap: 'bg-emerald-500/15 text-emerald-600' },
  vermelho: { iconWrap: 'bg-red-500/15 text-red-600' },
  amarelo:  { iconWrap: 'bg-amber-500/15 text-amber-600' },
  azul:     { iconWrap: 'bg-blue-500/15 text-blue-600' },
}

export function StatCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  cor = 'padrao',
  todoEmDia,
  zeroText = 'Tudo em dia',
  tendencia,
}: StatCardProps) {
  const cores = coresMap[cor]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 py-5 px-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <p
          className="text-[11px] font-bold uppercase tracking-widest text-slate-500"
          style={{ marginBottom: 0 }}
        >
          {titulo}
        </p>
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', cores.iconWrap)}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>

      {/* Value */}
      <div className="mt-3">
        {todoEmDia ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="text-[18px] font-bold text-emerald-600 leading-none">{zeroText}</span>
          </div>
        ) : (
          <p
            className="font-extrabold text-slate-900 leading-none"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(24px, 2.4vw, 30px)' }}
          >
            {valor}
          </p>
        )}
        {descricao && !todoEmDia && (
          <p className="text-[12px] text-slate-400 mt-1.5">{descricao}</p>
        )}
      </div>

      {/* Trend footer */}
      {tendencia !== undefined && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
          {tendencia === null ? (
            <span className="text-[11px] text-slate-400">sem dados do mês anterior</span>
          ) : tendencia.positivo ? (
            <>
              <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-600">+{tendencia.percentual}%</span>
              <span className="text-[11px] text-slate-400">vs mês anterior</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />
              <span className="text-[11px] font-semibold text-red-500">−{tendencia.percentual}%</span>
              <span className="text-[11px] text-slate-400">vs mês anterior</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
