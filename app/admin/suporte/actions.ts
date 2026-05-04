'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { criarNotificacao } from '@/lib/notificacoes'
import { enviarRespostaSuporte } from '@/lib/email'
import { registrarLog } from '@/lib/log'
import {
  STATUS_LABELS,
  type TicketStatus,
  type TicketPrioridade,
} from '@/lib/suporte'

const STATUS_VALIDOS: TicketStatus[] = ['open', 'em_andamento', 'aguardando_usuario', 'resolvido', 'fechado']
const PRIORIDADES_VALIDAS: TicketPrioridade[] = ['baixa', 'normal', 'alta', 'urgente']

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }
  const ok = await isAdmin(user.id)
  if (!ok) return { error: 'Acesso negado' }
  return { userId: user.id }
}

// Admin responde ticket (publica) ou nota interna
export async function responderTicketAdmin(input: {
  ticketId: string
  conteudo: string
  isNotaInterna?: boolean
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const conteudo = input.conteudo.trim()
  if (conteudo.length < 1 || conteudo.length > 5000) {
    return { error: 'Mensagem deve ter entre 1 e 5000 caracteres.' }
  }

  const admin = createAdminClient()
  const { data: ticket } = await admin
    .from('tickets')
    .select('id, status, user_id, assunto, first_response_at')
    .eq('id', input.ticketId)
    .single()
  if (!ticket) return { error: 'Ticket nao encontrado.' }

  const { error } = await admin
    .from('ticket_mensagens')
    .insert({
      ticket_id: input.ticketId,
      autor_id: auth.userId,
      autor_role: 'admin',
      conteudo,
      is_nota_interna: input.isNotaInterna === true,
    })
  if (error) return { error: error.message }

  // Se for resposta publica (nao nota interna), atualiza first_response_at
  // e move status para aguardando_usuario.
  if (!input.isNotaInterna) {
    const updates = {
      status: 'aguardando_usuario' as const,
      ...(ticket.first_response_at ? {} : { first_response_at: new Date().toISOString() }),
    }
    await admin.from('tickets').update(updates).eq('id', input.ticketId)

    // Notificacao in-app pro user
    await criarNotificacao({
      userId: ticket.user_id,
      tipo: 'ticket_resposta_admin',
      titulo: 'Suporte respondeu seu ticket',
      mensagem: conteudo.slice(0, 100),
      link: `/suporte/${input.ticketId}`,
    })

    // Email pro user (com email do profile)
    const { data: profile } = await admin
      .from('profiles')
      .select('email, nome')
      .eq('id', ticket.user_id)
      .single()
    if (profile?.email) {
      try {
        await enviarRespostaSuporte({
          para: profile.email,
          nomeUsuario: profile.nome ?? '',
          assunto: ticket.assunto,
          mensagem: conteudo,
          ticketId: input.ticketId,
        })
      } catch (e) {
        console.error('[suporte] email resposta falhou:', e)
      }
    }
  }

  await registrarLog(auth.userId, 'ADMIN_TICKET_RESPONDIDO', 'ticket', input.ticketId, {
    nota_interna: input.isNotaInterna === true,
  })

  revalidatePath(`/suporte/${input.ticketId}`)
  revalidatePath(`/admin/suporte/${input.ticketId}`)
  revalidatePath('/admin/suporte')
  return {}
}

// Mudar status do ticket
export async function mudarStatusTicket(input: {
  ticketId: string
  status: TicketStatus
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (!STATUS_VALIDOS.includes(input.status)) return { error: 'Status invalido.' }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const updates = {
    status: input.status,
    ...(input.status === 'resolvido' ? { resolved_at: now } : {}),
    ...(input.status === 'fechado'   ? { closed_at: now }   : {}),
  }

  const { data: ticket } = await admin
    .from('tickets')
    .select('user_id, status')
    .eq('id', input.ticketId)
    .single()
  if (!ticket) return { error: 'Ticket nao encontrado.' }

  const { error } = await admin
    .from('tickets')
    .update(updates)
    .eq('id', input.ticketId)
  if (error) return { error: error.message }

  // Notifica user de mudancas relevantes
  if (input.status === 'resolvido' || input.status === 'fechado') {
    await criarNotificacao({
      userId: ticket.user_id,
      tipo: 'ticket_status',
      titulo: `Ticket ${STATUS_LABELS[input.status].toLowerCase()}`,
      mensagem: 'O suporte atualizou o status do seu ticket.',
      link: `/suporte/${input.ticketId}`,
    })
  }

  await registrarLog(auth.userId, 'ADMIN_TICKET_STATUS', 'ticket', input.ticketId, {
    de: ticket.status, para: input.status,
  })

  revalidatePath('/admin/suporte')
  revalidatePath(`/admin/suporte/${input.ticketId}`)
  revalidatePath(`/suporte/${input.ticketId}`)
  return {}
}

// Mudar prioridade
export async function mudarPrioridadeTicket(input: {
  ticketId: string
  prioridade: TicketPrioridade
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (!PRIORIDADES_VALIDAS.includes(input.prioridade)) return { error: 'Prioridade invalida.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('tickets')
    .update({ prioridade: input.prioridade })
    .eq('id', input.ticketId)
  if (error) return { error: error.message }

  await registrarLog(auth.userId, 'ADMIN_TICKET_PRIORIDADE', 'ticket', input.ticketId, {
    prioridade: input.prioridade,
  })

  revalidatePath('/admin/suporte')
  revalidatePath(`/admin/suporte/${input.ticketId}`)
  return {}
}

// Atribuir / desatribuir
export async function atribuirTicket(input: {
  ticketId: string
  assignedTo: string | null  // null para desatribuir
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createAdminClient()
  if (input.assignedTo) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', input.assignedTo)
      .single()
    if (profile?.role !== 'admin') return { error: 'Atribuir apenas para usuarios admin.' }
  }

  const { error } = await admin
    .from('tickets')
    .update({ assigned_to: input.assignedTo })
    .eq('id', input.ticketId)
  if (error) return { error: error.message }

  await registrarLog(auth.userId, 'ADMIN_TICKET_ATRIBUIDO', 'ticket', input.ticketId, {
    assigned_to: input.assignedTo,
  })

  revalidatePath('/admin/suporte')
  revalidatePath(`/admin/suporte/${input.ticketId}`)
  return {}
}

// Atualizar notas internas
export async function atualizarNotasInternas(input: {
  ticketId: string
  notas: string
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('tickets')
    .update({ notas_internas: input.notas.slice(0, 5000) || null })
    .eq('id', input.ticketId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/suporte/${input.ticketId}`)
  return {}
}
