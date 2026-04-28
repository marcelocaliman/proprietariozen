import {
  Play, UserPlus, UserMinus, CheckCircle2, AlertTriangle, Ban,
  TrendingUp, FileText, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { TimelineEvento } from '@/lib/timeline'

const ICONE_POR_TIPO: Record<TimelineEvento['tipo'], LucideIcon> = {
  contrato_iniciado: Play,
  inquilino_ativo: UserPlus,
  inquilino_anterior: UserMinus,
  pagamento: CheckCircle2,
  atraso: AlertTriangle,
  cancelamento: Ban,
  reajuste_aplicado: TrendingUp,
  reajuste_previsto: TrendingUp,
  fim_contrato: FileText,
  fim_contrato_previsto: Clock,
}

const COR_POR_TIPO: Record<TimelineEvento['tipo'], string> = {
  contrato_iniciado: 'bg-blue-100 text-blue-700',
  inquilino_ativo: 'bg-emerald-100 text-emerald-700',
  inquilino_anterior: 'bg-slate-100 text-slate-500',
  pagamento: 'bg-emerald-100 text-emerald-700',
  atraso: 'bg-red-100 text-red-700',
  cancelamento: 'bg-slate-100 text-slate-500',
  reajuste_aplicado: 'bg-amber-100 text-amber-700',
  reajuste_previsto: 'bg-amber-50 text-amber-700 border border-amber-200',
  fim_contrato: 'bg-red-100 text-red-700',
  fim_contrato_previsto: 'bg-amber-50 text-amber-700 border border-amber-200',
}

function formatarDataBR(data: string): string {
  return new Date(data + 'T00:00:00')
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
}

export function TimelineImovel({ eventos }: { eventos: TimelineEvento[] }) {
  if (!eventos.length) {
    return (
      <p className="text-sm text-slate-500 italic text-center py-12">
        Nenhum evento registrado ainda. À medida que aluguéis forem gerados e pagos,
        os eventos aparecem aqui.
      </p>
    )
  }

  // Separa em "Próximos" (futuros) e "Histórico"
  const futuros = eventos.filter(e => e.futuro)
  const passados = eventos.filter(e => !e.futuro)

  return (
    <div className="space-y-6">
      {futuros.length > 0 && (
        <Section titulo="Próximos eventos" eventos={futuros} />
      )}
      {passados.length > 0 && (
        <Section titulo="Histórico" eventos={passados} />
      )}
    </div>
  )
}

function Section({ titulo, eventos }: { titulo: string; eventos: TimelineEvento[] }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-3">{titulo}</p>
      <div className="relative pl-6 space-y-4">
        {/* Linha vertical da timeline */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />

        {eventos.map((evento, idx) => {
          const Icon = ICONE_POR_TIPO[evento.tipo]
          return (
            <div key={`${evento.tipo}-${idx}-${evento.data}`} className="relative">
              <div className={cn(
                'absolute -left-6 h-6 w-6 rounded-full flex items-center justify-center',
                COR_POR_TIPO[evento.tipo],
              )}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="bg-white rounded-lg border border-slate-100 p-3 ml-2">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900">{evento.titulo}</p>
                  <p className="text-xs text-slate-400 shrink-0">{formatarDataBR(evento.data)}</p>
                </div>
                {evento.descricao && (
                  <p className="text-xs text-slate-600 mt-0.5">{evento.descricao}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
