'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'
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
    <div className="space-y-4 lg:sticky lg:top-4">
      {/* Triagem */}
      <Section label="Triagem">
        <div className="space-y-3">
          <Field label="Status">
            <select
              value={ticket.status}
              onChange={e => handleStatus(e.target.value as TicketStatus)}
              disabled={pendingStatus}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {STATUS.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>

          <Field label="Prioridade">
            <select
              value={ticket.prioridade}
              onChange={e => handlePrioridade(e.target.value as TicketPrioridade)}
              disabled={pendingPrioridade}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {PRIORIDADES.map(p => (
                <option key={p} value={p}>{PRIORIDADE_LABELS[p]}</option>
              ))}
            </select>
          </Field>

          <Field label="Atribuído">
            <select
              value={ticket.assigned_to ?? ''}
              onChange={e => handleAssign(e.target.value)}
              disabled={pendingAssign}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">Sem atribuição</option>
              {admins.map(a => (
                <option key={a.id} value={a.id}>{a.nome ?? a.email ?? a.id.slice(0, 8)}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Métricas */}
      <Section label="Métricas">
        <div className="space-y-2">
          <Metric label="Aberto" value={formatDataHora(ticket.criado_em)} />
          <Metric
            label="1ª resposta"
            value={ticket.first_response_at ? formatDataHora(ticket.first_response_at) : 'Pendente'}
            hint={tempoResposta !== null ? formatTempo(tempoResposta) : undefined}
            hintColor={tempoResposta !== null ? 'emerald' : 'amber'}
          />
          {ticket.resolved_at && (
            <Metric label="Resolvido" value={formatDataHora(ticket.resolved_at)} hintColor="emerald" />
          )}
        </div>
      </Section>

      {/* Notas internas */}
      <Section label="Notas internas" amber>
        <div className="space-y-2">
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Anotações privadas (apenas admins)…"
            rows={4}
            maxLength={5000}
            className="w-full rounded-md border border-amber-200 bg-amber-50/40 px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleNotas}
              disabled={pendingNotas || notas === (ticket.notas_internas ?? '')}
              className="text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-100 h-7"
            >
              {pendingNotas && <Loader2 className="h-3 w-3 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ label, children, amber = false }: { label: string; children: React.ReactNode; amber?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${
      amber ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'
    }`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${
        amber ? 'text-amber-700' : 'text-slate-500'
      }`}>
        {amber && <Lock className="h-2.5 w-2.5" />}
        {label}
      </p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

function Metric({
  label, value, hint, hintColor,
}: {
  label: string
  value: string
  hint?: string
  hintColor?: 'emerald' | 'amber'
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-slate-700 font-semibold">{value}</span>
        {hint && (
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
            hintColor === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {hint}
          </span>
        )}
      </div>
    </div>
  )
}

function formatTempo(min: number): string {
  if (min < 60) return `${Math.round(min)}min`
  const h = min / 60
  if (h < 24) return `${h.toFixed(1)}h`
  return `${Math.round(h / 24)}d`
}
