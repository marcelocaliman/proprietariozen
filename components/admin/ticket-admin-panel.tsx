'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Lock, Activity, Settings2, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  STATUS_LABELS, PRIORIDADE_LABELS,
  type TicketStatus, type TicketPrioridade,
} from '@/lib/suporte'
import {
  mudarStatusTicket,
  mudarPrioridadeTicket,
  atribuirTicket,
  atualizarNotasInternas,
} from '@/app/admin/suporte/actions'
import { formatDataHora } from '@/components/suporte/format'

const STATUS: TicketStatus[]         = ['open', 'em_andamento', 'aguardando_usuario', 'resolvido', 'fechado']
const PRIORIDADES: TicketPrioridade[] = ['baixa', 'normal', 'alta', 'urgente']

interface Props {
  ticket: {
    id: string
    status: TicketStatus
    prioridade: TicketPrioridade
    assigned_to: string | null
    notas_internas: string | null
    first_response_at: string | null
    resolved_at: string | null
    criado_em: string
  }
  admins: { id: string; nome: string | null; email: string | null }[]
}

export function TicketAdminPanel({ ticket, admins }: Props) {
  const [pendingStatus,    startStatus]    = useTransition()
  const [pendingPrioridade, startPrio]     = useTransition()
  const [pendingAssign,    startAssign]    = useTransition()
  const [pendingNotas,     startNotas]     = useTransition()
  const [notas, setNotas] = useState(ticket.notas_internas ?? '')

  function handleStatus(s: TicketStatus) {
    startStatus(async () => {
      const r = await mudarStatusTicket({ ticketId: ticket.id, status: s })
      if (r.error) toast.error(r.error)
      else toast.success(`Status: ${STATUS_LABELS[s]}`)
    })
  }

  function handlePrioridade(p: TicketPrioridade) {
    startPrio(async () => {
      const r = await mudarPrioridadeTicket({ ticketId: ticket.id, prioridade: p })
      if (r.error) toast.error(r.error)
      else toast.success(`Prioridade: ${PRIORIDADE_LABELS[p]}`)
    })
  }

  function handleAssign(value: string) {
    startAssign(async () => {
      const r = await atribuirTicket({ ticketId: ticket.id, assignedTo: value || null })
      if (r.error) toast.error(r.error)
      else toast.success(value ? 'Atribuído' : 'Sem atribuição')
    })
  }

  function handleNotas() {
    startNotas(async () => {
      const r = await atualizarNotasInternas({ ticketId: ticket.id, notas })
      if (r.error) toast.error(r.error)
      else toast.success('Notas salvas')
    })
  }

  const tempoResposta = ticket.first_response_at
    ? ((new Date(ticket.first_response_at).getTime() - new Date(ticket.criado_em).getTime()) / 60_000)
    : null

  return (
    <div className="space-y-4 sticky top-4">
      {/* Card Triagem */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Settings2 className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Triagem</h3>
        </div>
        <div className="p-5 space-y-4">
          <FieldGroup label="Status">
            <select
              value={ticket.status}
              onChange={e => handleStatus(e.target.value as TicketStatus)}
              disabled={pendingStatus}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {STATUS.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Prioridade">
            <select
              value={ticket.prioridade}
              onChange={e => handlePrioridade(e.target.value as TicketPrioridade)}
              disabled={pendingPrioridade}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {PRIORIDADES.map(p => (
                <option key={p} value={p}>{PRIORIDADE_LABELS[p]}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Atribuído">
            <select
              value={ticket.assigned_to ?? ''}
              onChange={e => handleAssign(e.target.value)}
              disabled={pendingAssign}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">Sem atribuição</option>
              {admins.map(a => (
                <option key={a.id} value={a.id}>{a.nome ?? a.email ?? a.id.slice(0, 8)}</option>
              ))}
            </select>
          </FieldGroup>
        </div>
      </div>

      {/* Card Notas internas */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-200/60 bg-amber-100/30 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900">Notas internas</h3>
            <p className="text-[10px] text-amber-700/80 leading-tight">Apenas admins veem.</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Anotações privadas sobre esse caso…"
            rows={5}
            maxLength={5000}
            className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleNotas}
              disabled={pendingNotas || notas === (ticket.notas_internas ?? '')}
              className="text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-100 h-8"
            >
              {pendingNotas && <Loader2 className="h-3 w-3 animate-spin" />}
              Salvar notas
            </Button>
          </div>
        </div>
      </div>

      {/* Card Métricas / SLA */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Métricas</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <Metric
            icon={Calendar}
            label="Aberto"
            value={formatDataHora(ticket.criado_em)}
          />
          {ticket.first_response_at ? (
            <Metric
              icon={Clock}
              label="1ª resposta"
              value={formatDataHora(ticket.first_response_at)}
              hint={tempoResposta !== null ? formatTempo(tempoResposta) : undefined}
              hintColor="emerald"
            />
          ) : (
            <Metric icon={Clock} label="1ª resposta" value="Pendente" hintColor="amber" />
          )}
          {ticket.resolved_at && (
            <Metric
              icon={CheckCircle2}
              label="Resolvido"
              value={formatDataHora(ticket.resolved_at)}
              hintColor="emerald"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function Metric({
  icon: Icon, label, value, hint, hintColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  hintColor?: 'emerald' | 'amber'
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</p>
        <p className="text-xs font-semibold text-slate-700 truncate">{value}</p>
      </div>
      {hint && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          hintColor === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {hint}
        </span>
      )}
    </div>
  )
}

function formatTempo(min: number): string {
  if (min < 60) return `${Math.round(min)}min`
  const h = min / 60
  if (h < 24) return `${h.toFixed(1)}h`
  return `${Math.round(h / 24)}d`
}
