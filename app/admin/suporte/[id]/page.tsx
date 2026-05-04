import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { TicketThread } from '@/components/suporte/ticket-thread'
import { TicketHero } from '@/components/suporte/ticket-hero'
import { TicketAdminPanel } from '@/components/admin/ticket-admin-panel'
import { getSystemSettings } from '@/lib/system-settings'
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
  const [{ data: ticket }, { data: mensagens }, { data: admins }, settings] = await Promise.all([
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

    getSystemSettings(admin),
  ])

  if (!ticket) notFound()

  await admin
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', user.id)
    .eq('lida', false)
    .like('link', `%/admin/suporte/${id}%`)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <Link
        href="/admin/suporte"
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
        usuario={ticket.profiles}
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TicketThread
            ticketId={ticket.id}
            ticketStatus={ticket.status}
            mensagens={mensagens ?? []}
            currentUserId={user.id}
            isAdminView
            templates={settings.support_templates.items}
            userNome={ticket.profiles?.nome ?? null}
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
