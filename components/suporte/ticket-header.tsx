import { ChevronLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { TicketStatusBadge, TicketPrioridadeBadge } from './ticket-badges'
import { CATEGORIA_LABELS, type TicketStatus, type TicketPrioridade, type TicketCategoria } from '@/lib/suporte'
import { formatDataRelativa } from './format'

interface Props {
  assunto: string
  status: TicketStatus
  prioridade: TicketPrioridade
  categoria: TicketCategoria
  criadoEm: string
  voltarHref: string
  voltarLabel?: string
  // Admin: info do solicitante
  usuario?: {
    nome: string | null
    email: string | null
    plano: string | null
  } | null
}

export function TicketHeader({
  assunto, status, prioridade, categoria, criadoEm,
  voltarHref, voltarLabel = 'Todos os tickets', usuario,
}: Props) {
  return (
    <div className="space-y-3 pb-5 border-b border-slate-200">
      <Link
        href={voltarHref}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {voltarLabel}
      </Link>

      <div className="flex items-center gap-2 flex-wrap">
        <TicketStatusBadge status={status} />
        <TicketPrioridadeBadge prioridade={prioridade} />
        <span className="text-[11px] font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">
          {CATEGORIA_LABELS[categoria]}
        </span>
      </div>

      <h1
        className="font-bold text-slate-900 leading-tight"
        style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', letterSpacing: '-0.015em' }}
      >
        {assunto}
      </h1>

      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          Aberto {formatDataRelativa(criadoEm)}
        </span>
        {usuario && (
          <>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">{usuario.nome ?? '—'}</span>
              <span className="text-slate-400">{usuario.email ?? ''}</span>
              {usuario.plano && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600">
                  {usuario.plano}
                </span>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
