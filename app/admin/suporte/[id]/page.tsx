import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { TicketThread } from '@/components/suporte/ticket-thread'
import { TicketStatusBadge, TicketPrioridadeBadge, TicketCategoriaLabel } from '@/components/suporte/ticket-badges'
import { formatDataHora } from '@/components/suporte/format'
import { TicketAdminPanel } from '@/components/admin/ticket-admin-panel'
import type { TicketStatus, TicketPrioridade, TicketCategoria } from '@/lib/suporte'

export const metadata = { title: 'Ticket — Admin ProprietárioZen' }

type TicketDetail = {
  id: string
  user_id: string
  assunto: string
  status: TicketStatus
  prioridade: TicketPrioridade
  categoria: TicketCategoria
  assigned_to: string | null
  notas_internas: string | null
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  criado_em: string
  atualizado_em: string
  profiles: { nome: string | null; email: string | null; plano: string | null } | null
}

type Mensagem = {
  id: string
  autor_id: string | null
  autor_role: 'user' | 'admin'
  conteudo: string
  is_nota_interna: boolean
  criado_em: string
}

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()
  const [{ data: ticket }, { data: mensagens }, { data: admins }] = await Promise.all([
    admin
      .from('tickets')
      .select('*, profiles!tickets_user_id_fkey(nome, email, plano)')
      .eq('id', id)
      .single() as unknown as Promise<{ data: TicketDetail | null }>,

    admin
      .from('ticket_mensagens')
      .select('id, autor_id, autor_role, conteudo, is_nota_interna, criado_em')
      .eq('ticket_id', id)
      .order('criado_em', { ascending: true }) as unknown as Promise<{ data: Mensagem[] | null }>,

    admin
      .from('profiles')
      .select('id, nome, email')
      .eq('role', 'admin'),
  ])

  if (!ticket) notFound()

  // Marca notificações desse ticket como lidas pro admin atual
  await admin
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', user.id)
    .eq('lida', false)
    .like('link', `%/admin/suporte/${id}%`)

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div>
        <Link
          href="/admin/suporte"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPrioridadeBadge prioridade={ticket.prioridade} />
          <span className="text-[11px] text-slate-400">
            <TicketCategoriaLabel categoria={ticket.categoria} />
          </span>
        </div>
        <h1
          className="font-extrabold tracking-tight text-slate-900 leading-tight"
          style={{ letterSpacing: '-0.025em', fontSize: 'clamp(22px, 2.4vw, 30px)' }}
        >
          {ticket.assunto}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          <span className="font-medium text-slate-700">{ticket.profiles?.nome ?? '—'}</span>
          <span className="text-slate-400"> · {ticket.profiles?.email ?? '—'}</span>
          <span className="text-slate-400"> · plano {ticket.profiles?.plano ?? '—'}</span>
          <span className="text-slate-400"> · aberto em {formatDataHora(ticket.criado_em)}</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TicketThread
            ticketId={ticket.id}
            ticketStatus={ticket.status}
            mensagens={mensagens ?? []}
            currentUserId={user.id}
            isAdminView
          />
        </div>
        <div className="lg:col-span-1">
          <TicketAdminPanel
            ticket={{
              id: ticket.id,
              status: ticket.status,
              prioridade: ticket.prioridade,
              assigned_to: ticket.assigned_to,
              notas_internas: ticket.notas_internas,
              first_response_at: ticket.first_response_at,
              resolved_at: ticket.resolved_at,
              criado_em: ticket.criado_em,
            }}
            admins={(admins ?? []) as { id: string; nome: string | null; email: string | null }[]}
          />
        </div>
      </div>
    </div>
  )
}
