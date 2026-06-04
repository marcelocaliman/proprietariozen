'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'
import type { ContratoInput } from '@/app/(dashboard)/imoveis/actions'

/** Revoga todos os tokens ativos de um inquilino (usa admin para bypassar RLS). */
async function revogarTokensInquilino(inquilinoId: string) {
  const admin = createAdminClient()
  await admin
    .from('inquilino_tokens')
    .update({ ativo: false })
    .eq('inquilino_id', inquilinoId)
    .eq('ativo', true)
}

export type InquilinoInput = {
  imovel_id: string
  nome: string
  telefone: string | null
  email: string | null
  cpf: string | null
}

export async function criarInquilino(input: InquilinoInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inserted, error } = await supabase
    .from('inquilinos')
    .insert({ user_id: user.id, ...input })
    .select('id')
    .single()
  if (error) return { error: error.message }
  await registrarLog(user.id, 'INQUILINO_CRIADO', 'inquilino', inserted?.id, { nome: input.nome })
  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

export async function criarInquilinoComContrato(
  inquilinoInput: InquilinoInput,
  contratoInput: ContratoInput,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inserted, error } = await supabase
    .from('inquilinos')
    .insert({ user_id: user.id, ...inquilinoInput })
    .select('id')
    .single()
  if (error) return { error: error.message }

  const { error: errContrato } = await supabase
    .from('imoveis')
    .update(contratoInput)
    .eq('id', inquilinoInput.imovel_id)
    .eq('user_id', user.id)
  if (errContrato) return { error: errContrato.message }

  await registrarLog(user.id, 'INQUILINO_CRIADO', 'inquilino', inserted?.id, { nome: inquilinoInput.nome })
  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  revalidatePath('/dashboard')
  return {}
}

export async function editarInquilino(id: string, input: InquilinoInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Verifica se o imóvel está sendo alterado (inquilino sai do imóvel atual)
  const { data: atual } = await supabase
    .from('inquilinos')
    .select('imovel_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('inquilinos')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  // Se o imóvel mudou, revoga tokens — o link antigo não faz mais sentido
  if (atual && atual.imovel_id !== input.imovel_id) {
    await revogarTokensInquilino(id)
  }

  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

export async function desativarInquilino(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('inquilinos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  // Revoga tokens de acesso público ao desativar o inquilino
  await revogarTokensInquilino(id)

  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

/**
 * Desvincula um inquilino do imóvel.
 * - Marca ativo=false
 * - Revoga tokens de acesso
 * - Opcionalmente remove cobranças futuras pendentes/atrasadas (mês corrente é mantido)
 *
 * Mantém imovel_id e o histórico todo. O cadastro do inquilino fica salvo
 * pra eventualmente ser reaproveitado em outro imóvel via "Editar inquilino".
 */
export async function desvincularInquilino(
  id: string,
  opcoes: { encerrarCobrancasFuturas: boolean },
): Promise<{ error?: string; cobrancasRemovidas?: number }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Carrega inquilino + imovel pra log
  const { data: inq } = await supabase
    .from('inquilinos')
    .select('nome, imovel_id, imovel:imoveis(apelido)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!inq) return { error: 'Inquilino não encontrado' }

  // 1. Desativa
  const { error: errUpdate } = await supabase
    .from('inquilinos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', user.id)
  if (errUpdate) return { error: errUpdate.message }

  // 2. Revoga tokens
  await revogarTokensInquilino(id)

  // 3. Opcionalmente, remove cobranças futuras pendentes/atrasadas
  let cobrancasRemovidas = 0
  if (opcoes.encerrarCobrancasFuturas && inq.imovel_id) {
    const admin = createAdminClient()
    const hoje = new Date()
    const mesAtualRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

    const { data: aRemover } = await admin
      .from('alugueis')
      .select('id')
      .eq('imovel_id', inq.imovel_id)
      .in('status', ['pendente', 'atrasado'])
      .gt('mes_referencia', mesAtualRef)

    if (aRemover && aRemover.length > 0) {
      const ids = aRemover.map(a => a.id)
      const { error: errDel } = await admin.from('alugueis').delete().in('id', ids)
      if (errDel) return { error: errDel.message }
      cobrancasRemovidas = ids.length
    }
  }

  await registrarLog(user.id, 'INQUILINO_DESVINCULADO', 'inquilino', id, {
    nome: inq.nome,
    encerrou_cobrancas: opcoes.encerrarCobrancasFuturas,
    cobrancas_removidas: cobrancasRemovidas,
  })

  revalidatePath('/inquilinos')
  revalidatePath(`/inquilinos/${id}`)
  revalidatePath('/imoveis')
  if (inq.imovel_id) revalidatePath(`/imoveis/${inq.imovel_id}`)
  revalidatePath('/dashboard')
  return { cobrancasRemovidas }
}

// Exclusão "limpa": deleta inquilino + tokens + documentos + aluguéis
// sem valor contábil (pendentes/atrasados/cancelados/estornados).
// BLOQUEIA se houver aluguel PAGO — retorna requiresHardDelete.
export async function excluirInquilino(id: string): Promise<{
  error?: string
  requiresHardDelete?: { nome: string; countPagos: number; valorTotal: number }
}> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inq } = await supabase
    .from('inquilinos')
    .select('id, nome, imovel_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!inq) return { error: 'Inquilino não encontrado.' }

  const { data: pagos } = await supabase
    .from('alugueis')
    .select('valor_pago, valor')
    .eq('inquilino_id', id)
    .eq('status', 'pago')
  const countPagos = pagos?.length ?? 0
  if (countPagos > 0) {
    const valorTotal = pagos!.reduce((s, a) => s + (a.valor_pago ?? a.valor ?? 0), 0)
    return { requiresHardDelete: { nome: inq.nome, countPagos, valorTotal } }
  }

  return cascadeDeleteInquilino(id, user.id, inq.nome, inq.imovel_id)
}

// Exclusão DESTRUTIVA: apaga inquilino mesmo com aluguéis pagos.
// Exige confirmação digitando o nome. Loga em activity_logs.
export async function excluirInquilinoComHistorico(input: {
  id: string
  confirmacao_nome: string
}): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inq } = await supabase
    .from('inquilinos')
    .select('id, nome, imovel_id')
    .eq('id', input.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!inq) return { error: 'Inquilino não encontrado.' }

  if (input.confirmacao_nome.trim() !== inq.nome) {
    return { error: `Digite exatamente "${inq.nome}" para confirmar.` }
  }

  const { count: countPagos } = await supabase
    .from('alugueis')
    .select('id', { count: 'exact', head: true })
    .eq('inquilino_id', input.id)
    .eq('status', 'pago')

  await registrarLog(user.id, 'INQUILINO_EXCLUIDO_COM_HISTORICO', 'inquilino', input.id, {
    nome: inq.nome,
    alugueis_pagos_descartados: countPagos ?? 0,
  })

  return cascadeDeleteInquilino(input.id, user.id, inq.nome, inq.imovel_id, { incluirHistorico: true })
}

async function cascadeDeleteInquilino(
  inquilinoId: string,
  userId: string,
  nome: string,
  imovelId: string | null,
  opts: { incluirHistorico?: boolean } = {},
): Promise<{ error?: string }> {
  const admin = createAdminClient()

  // 1. Aluguéis vinculados — rascunhos sempre, pagos só se incluirHistorico
  if (opts.incluirHistorico) {
    const { data: alugueisIds } = await admin
      .from('alugueis')
      .select('id')
      .eq('inquilino_id', inquilinoId)
    const ids = (alugueisIds ?? []).map(a => a.id)
    if (ids.length > 0) {
      const { data: docsAlu } = await admin
        .from('documentos_aluguel')
        .select('id, storage_path')
        .in('aluguel_id', ids)
      if (docsAlu && docsAlu.length > 0) {
        const paths = docsAlu.map(d => d.storage_path).filter(Boolean) as string[]
        if (paths.length > 0) {
          await admin.storage.from('documentos-aluguel').remove(paths)
        }
        await admin.from('documentos_aluguel').delete().in('aluguel_id', ids)
      }
      await admin.from('alugueis').delete().in('id', ids)
    }
  } else {
    await admin
      .from('alugueis')
      .delete()
      .eq('inquilino_id', inquilinoId)
      .in('status', ['pendente', 'atrasado', 'cancelado', 'estornado'])
  }

  // 2. Documentos do inquilino
  const { data: docs } = await admin
    .from('documentos_inquilino')
    .select('id, storage_path')
    .eq('inquilino_id', inquilinoId)
  if (docs && docs.length > 0) {
    const paths = docs.map(d => d.storage_path).filter(Boolean) as string[]
    if (paths.length > 0) {
      await admin.storage.from('documentos-inquilino').remove(paths)
    }
    await admin.from('documentos_inquilino').delete().eq('inquilino_id', inquilinoId)
  }

  // 3. Tokens
  await admin.from('inquilino_tokens').delete().eq('inquilino_id', inquilinoId)

  // 4. Inquilino
  const { error: errDel } = await admin
    .from('inquilinos')
    .delete()
    .eq('id', inquilinoId)
    .eq('user_id', userId)
  if (errDel) return { error: errDel.message }

  if (!opts.incluirHistorico) {
    await registrarLog(userId, 'INQUILINO_EXCLUIDO', 'inquilino', inquilinoId, { nome })
  }

  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  if (imovelId) revalidatePath(`/imoveis/${imovelId}`)
  revalidatePath('/dashboard')
  revalidatePath('/alugueis')
  return {}
}
