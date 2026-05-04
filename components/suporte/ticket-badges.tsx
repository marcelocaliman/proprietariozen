import { cn } from '@/lib/utils'
import {
  STATUS_LABELS, STATUS_COLORS,
  PRIORIDADE_LABELS, PRIORIDADE_COLORS,
  CATEGORIA_LABELS,
  type TicketStatus, type TicketPrioridade, type TicketCategoria,
} from '@/lib/suporte'

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold',
      STATUS_COLORS[status],
    )}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function TicketPrioridadeBadge({ prioridade }: { prioridade: TicketPrioridade }) {
  if (prioridade === 'normal') return null
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold',
      PRIORIDADE_COLORS[prioridade],
    )}>
      {PRIORIDADE_LABELS[prioridade]}
    </span>
  )
}

export function TicketCategoriaLabel({ categoria }: { categoria: TicketCategoria }) {
  return <>{CATEGORIA_LABELS[categoria]}</>
}
