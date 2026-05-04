'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, UserPlus, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-3">
      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Status</p>
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
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Prioridade</p>
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
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Atribuído</p>
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
            {!ticket.assigned_to && (
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                Atribua a si para indicar que está cuidando.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-amber-200 bg-amber-50/30 shadow-sm">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-700" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Notas internas</p>
          </div>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Anotações privadas sobre esse caso (apenas admins veem)…"
            rows={4}
            maxLength={5000}
            className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleNotas}
              disabled={pendingNotas || notas === (ticket.notas_internas ?? '')}
              className="text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              {pendingNotas && <Loader2 className="h-3 w-3 animate-spin" />}
              Salvar notas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="p-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Métricas</p>
          <Metric label="Aberto em" value={formatDataHora(ticket.criado_em)} />
          {ticket.first_response_at ? (
            <Metric
              label="Primeira resposta"
              value={`${formatDataHora(ticket.first_response_at)}${tempoResposta !== null ? ` (${formatTempo(tempoResposta)})` : ''}`}
            />
          ) : (
            <Metric label="Primeira resposta" value="—" />
          )}
          {ticket.resolved_at && (
            <Metric label="Resolvido" value={formatDataHora(ticket.resolved_at)} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  )
}

function formatTempo(min: number): string {
  if (min < 60) return `${Math.round(min)}min`
  const h = min / 60
  if (h < 24) return `${h.toFixed(1)}h`
  return `${Math.round(h / 24)}d`
}
