import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TicketThread } from '@/components/suporte/ticket-thread'
import { TicketHeader } from '@/components/suporte/ticket-header'
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

  const [{ data: ticket }, { data: mensagens }, { data: profile }] = await Promise.all([
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

    supabase.from('profiles').select('nome').eq('id', user.id).single(),
  ])

  if (!ticket) notFound()

  await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', user.id)
    .eq('lida', false)
    .like('link', `%/suporte/${id}%`)

  return (
    <div className="max-w-3xl mx-auto">
      <TicketHeader
        assunto={ticket.assunto}
        status={ticket.status}
        prioridade={ticket.prioridade}
        categoria={ticket.categoria}
        criadoEm={ticket.criado_em}
        voltarHref="/suporte"
      />

      <div className="pt-6">
        <TicketThread
          ticketId={ticket.id}
          ticketStatus={ticket.status}
          mensagens={mensagens ?? []}
          currentUserId={user.id}
          isAdminView={false}
          userNome={(profile as { nome?: string } | null)?.nome ?? null}
        />
      </div>
    </div>
  )
}
