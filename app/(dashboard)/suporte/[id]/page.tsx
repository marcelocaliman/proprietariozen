import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TicketThread } from '@/components/suporte/ticket-thread'
import { TicketHero } from '@/components/suporte/ticket-hero'
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

  // Marca notificações desse ticket como lidas (silencioso)
  await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', user.id)
    .eq('lida', false)
    .like('link', `%/suporte/${id}%`)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link
        href="/suporte"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Todos os tickets
      </Link>

      <TicketHero
        assunto={ticket.assunto}
        status={ticket.status}
        prioridade={ticket.prioridade}
        categoria={ticket.categoria}
        criadoEm={ticket.criado_em}
      />

      <TicketThread
        ticketId={ticket.id}
        ticketStatus={ticket.status}
        mensagens={mensagens ?? []}
        currentUserId={user.id}
        isAdminView={false}
        userNome={(profile as { nome?: string } | null)?.nome ?? null}
      />
    </div>
  )
}
