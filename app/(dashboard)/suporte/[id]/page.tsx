import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TicketThread } from '@/components/suporte/ticket-thread'
import { TicketStatusBadge, TicketPrioridadeBadge, TicketCategoriaLabel } from '@/components/suporte/ticket-badges'
import { formatDataHora } from '@/components/suporte/format'
import type { TicketStatus, TicketPrioridade, TicketCategoria } from '@/lib/suporte'

export const metadata = { title: 'Ticket — ProprietárioZen' }

type TicketDetail = {
  id: string
  user_id: string
  assunto: string
  status: TicketStatus
  prioridade: TicketPrioridade
  categoria: TicketCategoria
  criado_em: string
}

type Mensagem = {
  id: string
  autor_id: string | null
  autor_role: 'user' | 'admin'
  conteudo: string
  is_nota_interna: boolean
  criado_em: string
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: ticket }, { data: mensagens }] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, user_id, assunto, status, prioridade, categoria, criado_em')
      .eq('id', id)
      .single() as unknown as Promise<{ data: TicketDetail | null }>,

    supabase
      .from('ticket_mensagens')
      .select('id, autor_id, autor_role, conteudo, is_nota_interna, criado_em')
      .eq('ticket_id', id)
      .order('criado_em', { ascending: true }) as unknown as Promise<{ data: Mensagem[] | null }>,
  ])

  if (!ticket) notFound()

  // Marca notificações desse ticket como lidas (silencioso)
  await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', user.id)
    .eq('lida', false)
    .like('link', `%/suporte/${id}%`)

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <Link
          href="/suporte"
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
        <p className="text-xs text-slate-400 mt-1">
          Aberto em {formatDataHora(ticket.criado_em)}
        </p>
      </div>

      <TicketThread
        ticketId={ticket.id}
        ticketStatus={ticket.status}
        mensagens={mensagens ?? []}
        currentUserId={user.id}
        isAdminView={false}
      />
    </div>
  )
}
