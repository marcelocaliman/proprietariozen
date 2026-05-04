'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { criarNotificacao } from '@/lib/notificacoes'
import { isAdmin } from '@/lib/admin'
import { TICKETS_MAX_POR_DIA, type TicketCategoria } from '@/lib/suporte'

const CATEGORIAS_VALIDAS: TicketCategoria[] = ['bug', 'financeiro', 'conta', 'sugestao', 'duvida', 'outro']

function trim(s: string): string { return s.trim() }

// Criar ticket
export async function criarTicket(input: {
  assunto: string
  categoria: string
  conteudo: string
}): Promise<{ error?: string; ticketId?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }

  const assunto = trim(input.assunto)
  const conteudo = trim(input.conteudo)

  if (assunto.length < 3 || assunto.length > 200) {
    return { error: 'Assunto deve ter entre 3 e 200 caracteres.' }
  }
  if (conteudo.length < 10 || conteudo.length > 5000) {
    return { error: 'Mensagem deve ter entre 10 e 5000 caracteres.' }
  }
  if (!CATEGORIAS_VALIDAS.includes(input.categoria as TicketCategoria)) {
    return { error: 'Categoria invalida.' }
  }

  const ha24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: criadosUltimoDia } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('criado_em', ha24h)
  if ((criadosUltimoDia ?? 0) >= TICKETS_MAX_POR_DIA) {
    return { error: `Voce atingiu o limite de ${TICKETS_MAX_POR_DIA} tickets por dia. Tente novamente mais tarde.` }
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      user_id: user.id,
      assunto,
      categoria: input.categoria as TicketCategoria,
    })
    .select('id')
    .single()
  if (error || !ticket) return { error: error?.message ?? 'Erro ao criar ticket.' }

  const { error: msgErr } = await supabase
    .from('ticket_mensagens')
    .insert({
      ticket_id: ticket.id,
      autor_id: user.id,
      autor_role: 'user',
      conteudo,
    })
  if (msgErr) return { error: msgErr.message }

  // Notifica admins (todos)
  const admin = createAdminClient()
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
  for (const a of (admins ?? []) as { id: string }[]) {
    await criarNotificacao({
      userId: a.id,
      tipo: 'ticket_novo',
      titulo: 'Novo ticket de suporte',
      mensagem: `${assunto}`,
      link: `/admin/suporte/${ticket.id}`,
    })
  }

  revalidatePath('/suporte')
  revalidatePath('/admin/suporte')
  return { ticketId: ticket.id }
}

// Responder ticket (usuario)
export async function responderTicket(input: {
  ticketId: string
  conteudo: string
}): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }

  const conteudo = trim(input.conteudo)
  if (conteudo.length < 1 || conteudo.length > 5000) {
    return { error: 'Mensagem deve ter entre 1 e 5000 caracteres.' }
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, status, user_id')
    .eq('id', input.ticketId)
    .single()
  if (!ticket || ticket.user_id !== user.id) return { error: 'Ticket nao encontrado.' }
  if (ticket.status === 'fechado') return { error: 'Ticket fechado - abra um novo se precisar.' }

  const { error } = await supabase
    .from('ticket_mensagens')
    .insert({
      ticket_id: input.ticketId,
      autor_id: user.id,
      autor_role: 'user',
      conteudo,
    })
  if (error) return { error: error.message }

  const novoStatus = ticket.status === 'aguardando_usuario' ? 'em_andamento' : ticket.status
  await supabase.from('tickets').update({ status: novoStatus }).eq('id', input.ticketId)

  // Notifica admin atribuido (ou todos se nao tem)
  const admin = createAdminClient()
  const { data: assigned } = await admin
    .from('tickets')
    .select('assigned_to')
    .eq('id', input.ticketId)
    .single()
  let destinatarios: { id: string }[] = []
  if (assigned?.assigned_to) {
    destinatarios = [{ id: assigned.assigned_to }]
  } else {
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
    destinatarios = (admins ?? []) as { id: string }[]
  }
  for (const a of destinatarios) {
    await criarNotificacao({
      userId: a.id,
      tipo: 'ticket_resposta_usuario',
      titulo: 'Nova resposta em ticket',
      mensagem: conteudo.slice(0, 100),
      link: `/admin/suporte/${input.ticketId}`,
    })
  }

  revalidatePath(`/suporte/${input.ticketId}`)
  revalidatePath('/admin/suporte')
  revalidatePath(`/admin/suporte/${input.ticketId}`)
  return {}
}

// Fechar ticket
export async function fecharTicket(ticketId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }

  const userIsAdmin = await isAdmin(user.id)
  const { data: ticket } = await supabase
    .from('tickets')
    .select('user_id, status')
    .eq('id', ticketId)
    .single()
  if (!ticket) return { error: 'Ticket nao encontrado.' }
  if (!userIsAdmin && ticket.user_id !== user.id) return { error: 'Nao autorizado.' }
  if (ticket.status === 'fechado') return { error: 'Ticket ja esta fechado.' }

  const { error } = await supabase
    .from('tickets')
    .update({ status: 'fechado', closed_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) return { error: error.message }

  revalidatePath('/suporte')
  revalidatePath(`/suporte/${ticketId}`)
  revalidatePath('/admin/suporte')
  revalidatePath(`/admin/suporte/${ticketId}`)
  return {}
}

// Marcar notificacoes como lidas
export async function marcarNotificacoesLidas(ids?: string[]): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }

  let q = supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false)
  if (ids && ids.length > 0) q = q.in('id', ids)
  const { error } = await q
  if (error) return { error: error.message }

  revalidatePath('/suporte')
  return {}
}
